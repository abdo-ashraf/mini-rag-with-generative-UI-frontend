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
from tasks.file_processing import process_project_files
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

@data_router.post("/process/{project_id}")
async def process_endpoint(request: Request, project_id: int, process_request: ProcessRequest):

    chunk_size = process_request.chunk_size
    overlap_size = process_request.overlap_size
    do_reset = process_request.do_reset

    task = process_project_files.delay(
        project_id=str(project_id),
        file_id=process_request.file_id,
        chunk_size=chunk_size,
        overlap_size=overlap_size,
        do_reset=do_reset,
    )

    return JSONResponse(
        content={
            "signal": ResponseSignal.PROCESSING_SUCCESS.value,
            "task_id": task.id
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
        project_id=str(project_id),
        file_id=process_request.file_id,
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
