cd "$(dirname "$0")"

uvicorn backend_api:app --reload --port 8000 &
sleep 2
cd frontend && npm run dev &

wait
