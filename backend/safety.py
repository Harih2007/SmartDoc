"""
Safety & Responsible AI Module
Provides input validation, output checking, and response grounding.
"""

import re
from dataclasses import dataclass, field
from typing import List, Tuple


@dataclass
class SafetyReport:
    """Safety assessment of input or output."""
    is_safe: bool
    risk_level: str  # "low", "medium", "high"
    flags: List[str] = field(default_factory=list)
    sanitized_text: str = ""
    message: str = ""


class SafetyGuard:
    """Implements safety checks for input and output."""

    # Patterns that indicate prompt injection attempts
    INJECTION_PATTERNS = [
        r"ignore\s+(all\s+)?previous\s+instructions",
        r"ignore\s+(all\s+)?above",
        r"disregard\s+(all\s+)?previous",
        r"forget\s+(all\s+)?previous",
        r"you\s+are\s+now\s+(a|an)\s+",
        r"pretend\s+(you are|to be)\s+",
        r"act\s+as\s+(a|an)\s+",
        r"new\s+instruction",
        r"override\s+(the\s+)?system",
        r"jailbreak",
        r"\bDAN\b",
        r"developer\s+mode",
    ]

    # Maximum input length
    MAX_INPUT_LENGTH = 2000

    # Minimum input length
    MIN_INPUT_LENGTH = 2

    @classmethod
    def validate_input(cls, user_input: str) -> SafetyReport:
        """Validate user input for safety concerns."""
        flags = []
        risk_level = "low"

        # Check length
        if len(user_input.strip()) < cls.MIN_INPUT_LENGTH:
            return SafetyReport(
                is_safe=False,
                risk_level="low",
                flags=["input_too_short"],
                sanitized_text="",
                message="Please provide a more detailed question."
            )

        if len(user_input) > cls.MAX_INPUT_LENGTH:
            flags.append("input_too_long")
            risk_level = "medium"
            user_input = user_input[:cls.MAX_INPUT_LENGTH]

        # Check for injection patterns
        lower_input = user_input.lower()
        for pattern in cls.INJECTION_PATTERNS:
            if re.search(pattern, lower_input):
                flags.append("prompt_injection_detected")
                risk_level = "high"
                return SafetyReport(
                    is_safe=False,
                    risk_level=risk_level,
                    flags=flags,
                    sanitized_text="",
                    message="Your input was flagged for containing potentially harmful instructions. Please rephrase your question about the document."
                )

        # Check for excessive special characters (potential exploit)
        special_char_ratio = len(re.findall(r'[^a-zA-Z0-9\s.,!?\'-]', user_input)) / max(len(user_input), 1)
        if special_char_ratio > 0.4:
            flags.append("excessive_special_chars")
            risk_level = "medium"

        # Sanitize: remove potential code execution markers
        sanitized = re.sub(r'```[\s\S]*?```', '[code block removed]', user_input)
        sanitized = re.sub(r'<script[\s\S]*?</script>', '[script removed]', sanitized, flags=re.IGNORECASE)
        sanitized = re.sub(r'<[^>]+>', '', sanitized)  # Strip HTML tags

        return SafetyReport(
            is_safe=True,
            risk_level=risk_level,
            flags=flags,
            sanitized_text=sanitized.strip(),
            message=""
        )

    @classmethod
    def validate_output(cls, ai_response: str, source_chunks: list, relevance_scores: list) -> dict:
        """Validate AI output and compute confidence metrics."""

        # Compute confidence based on retrieval scores
        if relevance_scores:
            max_score = max(relevance_scores)
            avg_score = sum(relevance_scores) / len(relevance_scores)
            confidence = min(max_score * 100, 99)  # Cap at 99%
        else:
            confidence = 0
            max_score = 0
            avg_score = 0

        # Determine confidence level
        if confidence >= 70:
            confidence_level = "high"
        elif confidence >= 40:
            confidence_level = "medium"
        else:
            confidence_level = "low"

        # Check for potential hallucination indicators
        hallucination_flags = []

        # If AI response is very long but source material is short, could be hallucinating
        total_source_length = sum(len(c) for c in source_chunks) if source_chunks else 0
        if len(ai_response) > total_source_length * 2 and total_source_length > 0:
            hallucination_flags.append("response_longer_than_sources")

        # Check for phrases that indicate uncertainty or fabrication
        uncertainty_phrases = [
            "I think", "I believe", "probably", "might be", "could be",
            "I'm not sure", "it's possible", "generally speaking",
            "in general", "typically"
        ]
        uncertainty_count = sum(1 for phrase in uncertainty_phrases if phrase.lower() in ai_response.lower())
        if uncertainty_count >= 3:
            hallucination_flags.append("high_uncertainty_language")

        # Low confidence warning
        show_warning = confidence < 40 or len(hallucination_flags) > 0

        return {
            "confidence": round(confidence, 1),
            "confidence_level": confidence_level,
            "hallucination_flags": hallucination_flags,
            "show_warning": show_warning,
            "warning_message": "⚠️ This response may not be fully grounded in the document. Please verify with the original source." if show_warning else "",
            "sources_used": len(source_chunks),
            "max_relevance": round(max_score, 3),
            "avg_relevance": round(avg_score, 3),
        }

    @classmethod
    def compute_groundedness(cls, response: str, source_texts: List[str]) -> float:
        """
        Compute how grounded the response is in the source texts.
        Returns a score between 0 and 1.
        """
        if not source_texts or not response:
            return 0.0

        response_words = set(re.findall(r'\b\w{4,}\b', response.lower()))
        source_words = set()
        for text in source_texts:
            source_words.update(re.findall(r'\b\w{4,}\b', text.lower()))

        if not response_words:
            return 0.0

        overlap = response_words & source_words
        groundedness = len(overlap) / len(response_words)

        return min(groundedness, 1.0)
