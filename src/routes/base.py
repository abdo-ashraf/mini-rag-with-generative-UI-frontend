from fastapi import FastAPI, APIRouter, Depends, Request, status
from fastapi.responses import JSONResponse
import os
from helpers.config import get_settings, Settings
from time import sleep
import logging
from models.ProjectModel import ProjectModel
from models.ChunkModel import ChunkModel
from models.AssetModel import AssetModel
from models.db_schemes import Project
from models import ResponseSignal
from controllers import ProjectController

logger = logging.getLogger('uvicorn.error')

base_router = APIRouter(
    prefix="/api/v1",
    tags=["api_v1"],
)

@base_router.get("/")
async def welcome(app_settings: Settings = Depends(get_settings)):

    app_name = app_settings.APP_NAME
    app_version = app_settings.APP_VERSION

    return {
        "app_name": app_name,
        "app_version": app_version,
    }


@base_router.get("/projects")
async def get_projects(request: Request):
    project_model = await ProjectModel.create_instance(db_client=request.app.db_client)
    projects, _ = await project_model.get_all_projects(page=1, page_size=1000)

    return {
        "projects": [
            {
                "project_id": project.project_id,
                "created_at": project.created_at,
            }
            for project in projects
        ]
    }


@base_router.post("/projects")
async def create_project(request: Request):
    project_model = await ProjectModel.create_instance(db_client=request.app.db_client)
    project = await project_model.create_project(project=Project())

    return {
        "project": {
            "project_id": project.project_id,
            "created_at": project.created_at.isoformat() if project.created_at else None,
        }
    }


@base_router.delete("/projects/{project_id}")
async def delete_project(request: Request, project_id: int):

    # 1. Verify the project exists (don't auto-create)
    project_model = await ProjectModel.create_instance(db_client=request.app.db_client)
    project = await project_model.get_project_by_id(project_id=project_id)

    if not project:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={
                "signal": ResponseSignal.PROJECT_DELETE_ERROR.value,
                "message": f"Project {project_id} not found"
            }
        )

    try:
        # 2. Delete associated chunks
        chunk_model = await ChunkModel.create_instance(db_client=request.app.db_client)
        await chunk_model.delete_chunks_by_project_id(project_id=project_id)

        # 3. Delete associated assets
        asset_model = await AssetModel.create_instance(db_client=request.app.db_client)
        await asset_model.delete_assets_by_project_id(asset_project_id=project_id)

        # 4. Delete vector DB collection
        collection_name = f"collection_{request.app.vectordb_client.default_vector_size}_{project_id}"
        await request.app.vectordb_client.delete_collection(collection_name=collection_name)

        # 5. Delete project files from disk
        project_controller = ProjectController()
        project_controller.delete_project_dir(project_id=str(project_id))

        # 6. Delete the project record
        await project_model.delete_project(project_id=project_id)

        return JSONResponse(
            content={
                "signal": ResponseSignal.PROJECT_DELETE_SUCCESS.value,
                "project_id": project_id,
            }
        )

    except Exception as e:
        logger.error(f"Error while deleting project {project_id}: {e}")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "signal": ResponseSignal.PROJECT_DELETE_ERROR.value,
                "message": f"Failed to delete project {project_id}"
            }
        )
