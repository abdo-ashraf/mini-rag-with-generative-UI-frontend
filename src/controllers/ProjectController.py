from .BaseController import BaseController
from fastapi import UploadFile
from models import ResponseSignal
import os
import shutil

class ProjectController(BaseController):
    
    def __init__(self):
        super().__init__()

    def get_project_path(self, project_id: str):
        project_dir = os.path.join(
            self.files_dir,
            str(project_id)
        )

        if not os.path.exists(project_dir):
            os.makedirs(project_dir)

        return project_dir

    def delete_project_dir(self, project_id: str):
        project_path = os.path.join(
            self.files_dir,
            str(project_id)
        )

        if os.path.exists(project_path):
            shutil.rmtree(project_path)

    
