import os
from dotenv import load_dotenv

env_path = "/app/.env"
load_dotenv(dotenv_path=env_path)

class Config:
    # API KEY
    FMP_API_KEY = os.getenv('FMP_API_KEY')
    FMP_BASE_URL = 'https://financialmodelingprep.com/stable/'

    DB_HOST = os.getenv('DB_HOST')
    DB_NAME = os.getenv('DB_NAME')
    DB_USER = os.getenv('DB_USER')
    DB_PASSWORD = os.getenv('DB_PASSWORD')

    # The property decorator means when calling 
    # the method we dont need ()
    @property
    def db_url(self):
        return f"postgresql://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}/{self.DB_NAME}"


class Config_financial:

    DB_HOST = os.getenv('FINANCIAL_HOST')
    DB_NAME = os.getenv('FINANCIAL_NAME')
    DB_USER = os.getenv('FINANCIAL_USER')
    DB_PASSWORD = os.getenv('FINANCIAL_PASSWORD')

    # The property decorator means when calling 
    # the method we dont need ()
    @property
    def db_url(self):
        return f"postgresql://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}/{self.DB_NAME}"