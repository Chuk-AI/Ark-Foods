web: gunicorn app:app
worker2: python scheduler_tasks2.py
worker: celery -A app.celery worker --loglevel=info
