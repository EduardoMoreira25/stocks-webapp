import psycopg2
from psycopg2.pool import SimpleConnectionPool
# Importing the class
from config.settings import Config, Config_financial

class DBConnectorAPP:
    _pool = None

    # We use classmethod because we only want 1 pool shared by entire class
    @classmethod
    def get_pool(cls):
        if not cls._pool:
            cls._pool = SimpleConnectionPool(
                # With the connection pool we 
                # are creating right away 10 connections so 
                # we can reuse them
                # minconn = always 1 alive
                minconn=1,
                maxconn=10,
                host=Config.DB_HOST,
                database=Config.DB_NAME,
                user=Config.DB_USER,
                password=Config.DB_PASSWORD
            )
        return cls._pool

    @classmethod
    def execute(cls, query, params=None):
        """
        This method is just for UPDATE/DELETE/REPLACE operations
        Doesnt return anything
        """
        conn = cls.get_pool().getconn()
        try:
            with conn.cursor() as cur:
                cur.execute(query,params)
                conn.commit()
        finally:
            cls.get_pool().putconn(conn) # <- Need to pass the conn

    @classmethod
    def query(cls,query,params=None):
        """
        For SELECT operations, returns results
        """
        conn = cls.get_pool().getconn()
        try:
            with conn.cursor() as cur:
                cur.execute(query,params)
                return cur.fetchall()   # <- Returns data
        finally:
            cls.get_pool().putconn(conn)

    @classmethod
    def execute_returning(cls, query, params=None):
        """
        For INSERT operations with RETURNING clause
        Returns the result (e.g., newly created row)
        """
        conn = cls.get_pool().getconn()
        try:
            with conn.cursor() as cur:
                cur.execute(query, params)
                result = cur.fetchone()
                conn.commit()
                return result
        finally:
            cls.get_pool().putconn(conn)



class DBConnectorFinancials:
    _pool = None

    # We use classmethod because we only want 1 pool shared by entire class
    @classmethod
    def get_pool(cls):
        if not cls._pool:
            cls._pool = SimpleConnectionPool(
                # With the connection pool we 
                # are creating right away 10 connections so 
                # we can reuse them
                # minconn = always 1 alive
                minconn=1,
                maxconn=10,
                host=Config_financial.DB_HOST,
                database=Config_financial.DB_NAME,
                user=Config_financial.DB_USER,
                password=Config_financial.DB_PASSWORD
            )
        return cls._pool

    @classmethod
    def execute(cls, query, params=None):
        """
        This method is just for UPDATE/DELETE/REPLACE operations
        Doesnt return anything
        """
        conn = cls.get_pool().getconn()
        try:
            with conn.cursor() as cur:
                cur.execute(query,params)
                conn.commit()
        finally:
            cls.get_pool().putconn(conn) # <- Need to pass the conn

    @classmethod
    def query(cls,query,params=None):
        """
        For SELECT operations, returns results
        """
        conn = cls.get_pool().getconn()
        try:
            with conn.cursor() as cur:
                cur.execute(query,params)
                return cur.fetchall()   # <- Returns data
        finally:
            cls.get_pool().putconn(conn)

    @classmethod
    def execute_returning(cls, query, params=None):
        """
        For INSERT operations with RETURNING clause
        Returns the result (e.g., newly created row)
        """
        conn = cls.get_pool().getconn()
        try:
            with conn.cursor() as cur:
                cur.execute(query, params)
                result = cur.fetchone()
                conn.commit()
                return result
        finally:
            cls.get_pool().putconn(conn)