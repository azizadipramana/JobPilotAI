from fastapi import APIRouter

router = APIRouter()


@router.get("/auth/gmail/callback")
async def gmail_callback(code: str = None, error: str = None):
    if error:
        return {"error": error, "message": "Gmail OAuth was denied or failed."}
    # TODO Phase 6: exchange code for token, store securely
    return {
        "message": "Gmail OAuth callback received. Token exchange not yet implemented.",
        "code_received": bool(code),
    }
