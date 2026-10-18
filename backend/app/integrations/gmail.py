from __future__ import annotations

import logging
from typing import Optional

logger = logging.getLogger(__name__)


class GmailService:
    """
    Gmail API service.
    Phase 6: Real implementation requires OAuth credentials.
    Currently in stub/mock mode.
    """

    async def send(self, draft) -> str:
        """Send an email using Gmail API. Returns message ID."""
        # TODO Phase 6: implement OAuth token flow and real send
        raise NotImplementedError(
            "Gmail integration not yet configured. "
            "Add GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET to .env and set APP_ENV=production."
        )
