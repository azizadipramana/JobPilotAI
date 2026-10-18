from fastapi import APIRouter
from app.llm.client import get_llm_client

router = APIRouter()


@router.get("/llm/ping")
async def llm_ping():
    client = get_llm_client()
    result = await client.ping()
    return result


@router.post("/llm/test")
async def llm_test(payload: dict):
    prompt = payload.get("prompt", "Say hello in one sentence.")
    client = get_llm_client()
    response = await client.generate(prompt)
    return {"response": response}
