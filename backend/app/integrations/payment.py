import logging
import os
import uuid

logger = logging.getLogger(__name__)

try:
    import stripe
except ImportError:
    stripe = None

class PaymentGatewayIntegration:
    """
    Stripe payment integration with automatic mock fallback if Stripe is unconfigured.
    """

    @classmethod
    def _get_api_key(cls) -> str:
        return os.getenv("STRIPE_SECRET_KEY", "").strip()

    @classmethod
    def charge(cls, amount: float, currency: str = "USD", token: str = "pm_card_visa", metadata: dict = None) -> dict:
        """
        Creates and confirms a Stripe PaymentIntent or charges the customer.
        """
        api_key = cls._get_api_key()
        metadata = metadata or {}
        currency_lower = currency.lower()

        # If Stripe is installed and API key is provided, use live Stripe API
        if stripe and api_key and not api_key.startswith("mock_"):
            try:
                stripe.api_key = api_key
                # Amount in smallest currency unit (cents for USD)
                amount_in_cents = int(round(amount * 100))

                # Use payment method token if provided, default to test visa card
                pm = token if token and token.startswith("pm_") else "pm_card_visa"

                intent = stripe.PaymentIntent.create(
                    amount=amount_in_cents,
                    currency=currency_lower,
                    payment_method=pm,
                    confirm=True,
                    automatic_payment_methods={"enabled": True, "allow_redirects": "never"},
                    metadata=metadata,
                    description=f"TravelAI Booking Payment - {currency.upper()} {amount:.2f}"
                )

                logger.info(f"Stripe PaymentIntent created: {intent.id} status={intent.status}")
                return {
                    "status": "SUCCESS" if intent.status in ["succeeded", "processing", "requires_capture"] else "PENDING",
                    "amount": amount,
                    "currency": currency.upper(),
                    "charge_id": intent.id,
                    "gateway": "STRIPE",
                    "client_secret": getattr(intent, 'client_secret', None),
                    "raw_status": intent.status
                }
            except Exception as e:
                logger.error(f"Stripe charge failed: {str(e)}", exc_info=True)
                raise RuntimeError(f"Stripe payment failed: {str(e)}")

        # Fallback to simulated gateway
        logger.info(f"[Mock PaymentGateway] Charged {currency} {amount} via token {token}")
        charge_id = f"ch_mock_{uuid.uuid4().hex[:12]}"
        return {
            "status": "SUCCESS",
            "amount": amount,
            "currency": currency.upper(),
            "charge_id": charge_id,
            "gateway": "MOCK"
        }

    @classmethod
    def refund(cls, charge_id: str, amount: float = None, reason: str = "requested_by_customer") -> dict:
        """
        Refunds an existing Stripe PaymentIntent or Charge.
        """
        api_key = cls._get_api_key()
        if stripe and api_key and not api_key.startswith("mock_") and charge_id and not charge_id.startswith("ch_mock_"):
            try:
                stripe.api_key = api_key
                refund_kwargs = {"reason": reason}
                if charge_id.startswith("pi_"):
                    refund_kwargs["payment_intent"] = charge_id
                else:
                    refund_kwargs["charge"] = charge_id

                if amount and amount > 0:
                    refund_kwargs["amount"] = int(round(amount * 100))

                refund = stripe.Refund.create(**refund_kwargs)
                logger.info(f"Stripe Refund created: {refund.id} status={refund.status}")
                return {
                    "status": "REFUNDED",
                    "refund_id": refund.id,
                    "charge_id": charge_id,
                    "amount": (refund.amount / 100.0) if getattr(refund, 'amount', None) else amount,
                    "gateway": "STRIPE"
                }
            except Exception as e:
                logger.error(f"Stripe refund failed: {str(e)}", exc_info=True)
                raise RuntimeError(f"Stripe refund failed: {str(e)}")

        # Mock refund fallback
        logger.info(f"[Mock PaymentGateway] Refunded {charge_id}")
        return {
            "status": "REFUNDED",
            "refund_id": f"re_mock_{uuid.uuid4().hex[:12]}",
            "charge_id": charge_id,
            "amount": amount,
            "gateway": "MOCK"
        }

__all__ = ['PaymentGatewayIntegration']

