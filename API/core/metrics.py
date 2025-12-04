"""Simple in-memory counters for API observability (Prometheus-style)."""

class Counters:
    def __init__(self):
        self.declarations_created = 0
        self.declarations_synced = 0
        self.pending_declarations_created = 0
        self.pending_declarations_processed = 0
        self.sync_errors = 0
        self.recaptcha_failures = 0
        self.rate_limit_hits = 0

    def reset(self):
        """Reset all counters."""
        self.__init__()

    def to_dict(self):
        """Return all counters as dict."""
        return {
            'declarations_created': self.declarations_created,
            'declarations_synced': self.declarations_synced,
            'pending_declarations_created': self.pending_declarations_created,
            'pending_declarations_processed': self.pending_declarations_processed,
            'sync_errors': self.sync_errors,
            'recaptcha_failures': self.recaptcha_failures,
            'rate_limit_hits': self.rate_limit_hits,
        }


# Global counters instance
counters = Counters()
