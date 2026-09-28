class ConversationSummarizer:
    """
    Generates structured AI summaries for customer call sessions and handoffs.
    """

    @classmethod
    def summarize(cls, transcripts: list, intent: str = "GENERAL", customer_name: str = "Customer", use_gemini: bool = True) -> dict:
        if not transcripts:
            return {
                "summary": f"{customer_name} initiated contact regarding {intent.lower()} inquiries.",
                "action_items": ["Follow up with customer if needed"],
                "key_points": [f"Intent: {intent}"]
            }

        total_turns = len(transcripts)
        customer_lines = [t.get('message', '') for t in transcripts if t.get('speaker') in ['CUSTOMER', 'user']]
        ai_lines = [t.get('message', '') for t in transcripts if t.get('speaker') in ['AI', 'assistant']]

        topic_desc = f"{customer_name} called regarding {intent.replace('_', ' ').title()}."
        if customer_lines:
            latest_inquiry = customer_lines[-1]
            topic_desc += f" Primary request noted: '{latest_inquiry[:120]}...'."

        action_items = []
        if intent in ["REFUND", "CANCELLATION"]:
            action_items.append("Review payment transaction and authorize refund if eligible")
            action_items.append("Send confirmation email to customer")
        elif intent in ["BOOKING", "FLIGHT", "HOTEL", "TOUR"]:
            action_items.append("Verify seat/room availability in GDS")
            action_items.append("Issue booking voucher once payment is captured")
        elif intent == "HUMAN_AGENT":
            action_items.append("Live agent handoff completed with conversation context")
        else:
            action_items.append("Log interaction in CRM history")

        key_points = [
            f"Customer Intent: {intent}",
            f"Total dialogue turns: {total_turns}",
            f"Assisted by TravelAI Voice Engine"
        ]

        # Use Gemini for richer contextual summarization if transcripts exist
        if use_gemini and transcripts:
            try:
                from app.ai.gemini_client import GeminiClient

                dialogue_text = "\n".join([
                    f"{t.get('speaker', 'Unknown')}: {t.get('message', '')}"
                    for t in transcripts
                ])

                prompt = f"""You are an executive call center conversation summarizer for TravelAI.
Customer: {customer_name}
Overall Intent: {intent}

Full Transcript:
\"\"\"
{dialogue_text}
\"\"\"

Generate an objective, highly informative summary, actionable items for human travel agents/support, and key takeaway bullet points.
Always ensure customer name '{customer_name}' is mentioned in the summary, and include the intent keywords in action items or key points.

Respond ONLY with valid JSON in this format:
{{
  "summary": "Concise 2-3 sentence overview...",
  "action_items": ["item 1", "item 2", ...],
  "key_points": ["bullet 1", "bullet 2", ...]
}}"""
                gemini_res = GeminiClient.generate_json(prompt)
                if gemini_res and isinstance(gemini_res, dict) and "summary" in gemini_res:
                    g_summary = gemini_res.get("summary", "")
                    g_actions = gemini_res.get("action_items") or action_items
                    g_points = gemini_res.get("key_points") or key_points

                    # Ensure customer_name is in the summary for CRM continuity
                    if customer_name not in g_summary:
                        g_summary = f"{customer_name} interaction: {g_summary}"

                    # Ensure essential fallback action items are preserved if relevant
                    merged_actions = list(g_actions)
                    for fallback_item in action_items:
                        if not any(fallback_item.split()[0].lower() in a.lower() for a in merged_actions):
                            merged_actions.append(fallback_item)

                    return {
                        "summary": g_summary,
                        "action_items": merged_actions,
                        "key_points": g_points
                    }
            except Exception:
                pass

        return {
            "summary": topic_desc,
            "action_items": action_items,
            "key_points": key_points
        }
