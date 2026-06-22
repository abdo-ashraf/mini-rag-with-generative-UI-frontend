from fastapi import FastAPI, APIRouter, Depends, UploadFile, status, Request
from fastapi.responses import JSONResponse
import os
from helpers.config import get_settings, Settings
from controllers import DataController, ProjectController, ProcessController
import aiofiles
from models import ResponseSignal
import logging
from .schemes.data import ProcessRequest
from models.ProjectModel import ProjectModel
from models.ChunkModel import ChunkModel
from models.AssetModel import AssetModel
from models.db_schemes import DataChunk, Asset
from models.enums.AssetTypeEnum import AssetTypeEnum
from controllers import NLPController
from tasks.process_workflow import process_and_push_workflow

logger = logging.getLogger('uvicorn.error')

data_router = APIRouter(
    prefix="/api/v1/data",
    tags=["api_v1", "data"],
)

@data_router.post("/upload/{project_id}")
async def upload_data(request: Request, project_id: int, file: UploadFile,
                      app_settings: Settings = Depends(get_settings)):
        
    
    project_model = await ProjectModel.create_instance(
        db_client=request.app.db_client
    )

    project = await project_model.get_project_or_create_one(
        project_id=project_id
    )

    # validate the file properties
    data_controller = DataController()

    is_valid, result_signal = data_controller.validate_uploaded_file(file=file)

    if not is_valid:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "signal": result_signal
            }
        )

    if not file.filename:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "signal": ResponseSignal.FILE_UPLOAD_FAILED.value
            }
        )

    project_dir_path = ProjectController().get_project_path(project_id=str(project_id))
    file_path, file_id = data_controller.generate_unique_filepath(
        orig_file_name=file.filename,
        project_id=str(project_id)
    )

    try:
        async with aiofiles.open(file_path, "wb") as f:
            while chunk := await file.read(app_settings.FILE_DEFAULT_CHUNK_SIZE):
                await f.write(chunk)
    except Exception as e:

        logger.error(f"Error while uploading file: {e}")

        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "signal": ResponseSignal.FILE_UPLOAD_FAILED.value
            }
        )

    # store the assets into the database
    asset_model = await AssetModel.create_instance(
        db_client=request.app.db_client
    )

    asset_resource = Asset(
        asset_project_id=project.project_id,
        asset_type=AssetTypeEnum.FILE.value,
        asset_name=file_id,
        asset_raw_name=file.filename,
        asset_size=os.path.getsize(file_path)
    )

    asset_record = await asset_model.create_asset(asset=asset_resource)

    return JSONResponse(
            content={
                "signal": ResponseSignal.FILE_UPLOAD_SUCCESS.value,
                "file_id": str(asset_record.asset_id),
            }
        )


@data_router.get("/files/{project_id}")
async def get_project_files(request: Request, project_id: int):

    project_model = await ProjectModel.create_instance(
        db_client=request.app.db_client
    )

    project = await project_model.get_project_or_create_one(
        project_id=project_id
    )

    asset_model = await AssetModel.create_instance(
        db_client=request.app.db_client
    )

    project_assets = await asset_model.get_all_project_assets(
        asset_project_id=project_id,
        asset_type=AssetTypeEnum.FILE.value,
    )

    files = [
        {
            "file_id": asset.asset_id,
            "file_name": asset.asset_raw_name,
            "file_size": asset.asset_size,
            "created_at": asset.created_at.isoformat() if asset.created_at else None,
            "updated_at": asset.updated_at.isoformat() if asset.updated_at else None,
        }
        for asset in sorted(project_assets, key=lambda item: item.asset_id, reverse=True)
    ]

    return JSONResponse(
        content={
            "project_id": project_id,
            "file_count": len(files),
            "files": files,
        }
    )

@data_router.get("/chunks/count/{project_id}")
async def get_chunks_count(request: Request, project_id: int):

    chunk_model = await ChunkModel.create_instance(
        db_client=request.app.db_client
    )

    try:
        total_chunks = await chunk_model.get_total_chunks_count(project_id=project_id)
    except Exception as e:
        logger.error(f"Error getting chunks count for project {project_id}: {e}")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "signal": ResponseSignal.PROCESSING_FAILED.value,
                "error": str(e),
                "project_id": project_id,
                "chunks_count": 0,
            }
        )

    logger.info(f"Chunks count for project {project_id}: {total_chunks}")

    return JSONResponse(
        content={
            "signal": ResponseSignal.CHUNKS_COUNT_RETRIEVED.value,
            "project_id": project_id,
            "chunks_count": total_chunks,
        }
    )


@data_router.post("/process/{project_id}")
async def process_endpoint(request: Request, project_id: int, process_request: ProcessRequest):

    chunk_size = process_request.chunk_size
    overlap_size = process_request.overlap_size
    do_reset = process_request.do_reset

    project_model = await ProjectModel.create_instance(
        db_client=request.app.db_client
    )

    project = await project_model.get_project_or_create_one(
        project_id=project_id
    )

    nlp_controller = NLPController(
        vectordb_client=request.app.vectordb_client,
        generation_client=request.app.generation_client,
        embedding_client=request.app.embedding_client,
        template_parser=request.app.template_parser,
    )

    asset_model = await AssetModel.create_instance(
        db_client=request.app.db_client
    )

    project_files = await asset_model.get_all_project_assets(
        asset_project_id=project.project_id,
        asset_type=AssetTypeEnum.FILE.value,
    )

    project_files_ids = {
        record.asset_id: record.asset_name
        for record in project_files
    }

    if len(project_files_ids) == 0:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "signal": ResponseSignal.NO_FILES_ERROR.value,
            }
        )

    process_controller = ProcessController(project_id=project_id)

    chunk_model = await ChunkModel.create_instance(
        db_client=request.app.db_client
    )

    if do_reset == 1:
        collection_name = nlp_controller.create_collection_name(project_id=project.project_id)
        _ = await request.app.vectordb_client.delete_collection(collection_name=collection_name)
        _ = await chunk_model.delete_chunks_by_project_id(
            project_id=project.project_id
        )

    no_records = 0
    no_files = 0

    for asset_id, file_id in project_files_ids.items():

        file_content = process_controller.get_file_content(file_id=file_id)

        if file_content is None:
            logger.error(f"Error while processing file: {file_id}")
            continue

        file_chunks = process_controller.process_file_content(
            file_content=file_content,
            file_id=file_id,
            chunk_size=chunk_size,
            overlap_size=overlap_size
        )

        if file_chunks is None or len(file_chunks) == 0:
            logger.error(f"No chunks for file_id: {file_id}")
            continue

        file_chunks_records = [
            DataChunk(
                chunk_text=chunk.page_content,
                chunk_metadata=chunk.metadata,
                chunk_order=i+1,
                chunk_project_id=project.project_id,
                chunk_asset_id=asset_id
            )
            for i, chunk in enumerate(file_chunks)
        ]

        no_records += await chunk_model.insert_many_chunks(chunks=file_chunks_records)
        no_files += 1

    logger.warning(f"inserted_chunks: {no_records}")

    return JSONResponse(
        content={
            "signal": ResponseSignal.PROCESSING_SUCCESS.value,
            "inserted_chunks": no_records,
            "processed_files": no_files,
            "project_id": project_id,
            "do_reset": do_reset
        }
    )

@data_router.delete("/files/{project_id}/{file_id}")
async def delete_project_file(request: Request, project_id: int, file_id: int):

    asset_model = await AssetModel.create_instance(
        db_client=request.app.db_client
    )

    asset = await asset_model.get_asset_by_id(asset_id=file_id)
    if not asset or asset.asset_project_id != project_id:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={
                "signal": ResponseSignal.FILE_DELETE_ERROR.value,
                "message": f"File {file_id} not found in project {project_id}"
            }
        )

    try:
        chunk_model = await ChunkModel.create_instance(
            db_client=request.app.db_client
        )

        chunk_ids = await chunk_model.get_chunk_ids_by_asset_id(asset_id=file_id)

        if chunk_ids:
            collection_name = f"collection_{request.app.vectordb_client.default_vector_size}_{project_id}"
            await request.app.vectordb_client.delete_by_record_ids(
                collection_name=collection_name,
                record_ids=list(chunk_ids)
            )

        await chunk_model.delete_chunks_by_asset_id(asset_id=file_id)

        await asset_model.delete_asset_by_id(asset_id=file_id)

        project_controller = ProjectController()
        project_path = project_controller.get_project_path(project_id=str(project_id))
        file_path = os.path.join(project_path, asset.asset_name)
        if os.path.exists(file_path):
            os.remove(file_path)

        return JSONResponse(
            content={
                "signal": ResponseSignal.FILE_DELETE_SUCCESS.value,
                "file_id": file_id,
            }
        )

    except Exception as e:
        logger.error(f"Error while deleting file {file_id}: {e}")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "signal": ResponseSignal.FILE_DELETE_ERROR.value,
                "message": f"Failed to delete file {file_id}"
            }
        )


@data_router.post("/process-and-push/{project_id}")
async def process_and_push_endpoint(request: Request, project_id: int, process_request: ProcessRequest):

    chunk_size = process_request.chunk_size
    overlap_size = process_request.overlap_size
    do_reset = process_request.do_reset

    workflow_task = process_and_push_workflow.delay(
        project_id=project_id,
        chunk_size=chunk_size,
        overlap_size=overlap_size,
        do_reset=do_reset,
    )

    return JSONResponse(
        content={
            "signal": ResponseSignal.PROCESS_AND_PUSH_WORKFLOW_READY.value,
            "workflow_task_id": workflow_task.id
        }
    )
