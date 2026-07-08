"""
Prompt Manager — loads, renders, and manages prompt templates.
Templates are stored in project JSON configs and support variable interpolation.
"""
from __future__ import annotations

import re
from pathlib import Path
from typing import Any, Dict, Optional

from jinja2 import Environment, StrictUndefined, TemplateError, Template
from config.logging_config import get_logger

logger = get_logger(__name__)

# Built-in default prompt templates
DEFAULT_TEMPLATES: Dict[str, str] = {
    "default": """
You are a professional data research analyst. Your task is to find accurate, 
publicly available information about the following entity.

Entity Information:
{% for key, value in input_data.items() %}
- {{ key }}: {{ value }}
{% endfor %}

Please find and return the following information:
{% for col in target_columns %}
- {{ col }}
{% endfor %}

Rules:
1. Only use publicly available information
2. Do NOT hallucinate or guess
3. If you cannot find a piece of information, return null for that field
4. Return a confidence score (0.0-1.0) for each found field
5. Include the source URL where you found each piece of information

Return your response as a valid JSON object with this structure:
{
  "fields": {
    "field_name": {
      "value": "the found value or null",
      "confidence": 0.95,
      "source_url": "https://source.com/page"
    }
  },
  "overall_confidence": 0.90,
  "notes": "any additional notes"
}
""",

    "us_investors_v1": """
You are a professional investor research analyst specializing in US venture capital 
and investment firms.

Research the following investor and find their contact and professional information:

Name: {{ Name }}
Company: {{ Company }}
{% if City %}City: {{ City }}{% endif %}
{% if State %}State: {{ State }}{% endif %}

Find these specific fields:
- Email: Professional business email address
- Phone: Direct phone number
- Website: Professional website or firm website  
- LinkedIn: LinkedIn profile URL
- Bio: 2-3 sentence professional biography
- Investment Focus: Primary investment thesis/focus areas
- Portfolio Size: Approximate number of portfolio companies

Rules:
- Only use public information from LinkedIn, official websites, SEC filings, news
- Do NOT use private databases or paid sources
- If information is not publicly available, return null
- Never fabricate or guess contact information

Return valid JSON:
{
  "fields": {
    "Email": {"value": "...", "confidence": 0.9, "source_url": "..."},
    "Phone": {"value": null, "confidence": 0, "source_url": null},
    "Website": {"value": "...", "confidence": 0.95, "source_url": "..."},
    "LinkedIn": {"value": "...", "confidence": 0.95, "source_url": "..."},
    "Bio": {"value": "...", "confidence": 0.85, "source_url": "..."},
    "Investment Focus": {"value": "...", "confidence": 0.8, "source_url": "..."},
    "Portfolio Size": {"value": "...", "confidence": 0.7, "source_url": "..."}
  },
  "overall_confidence": 0.88,
  "notes": "Found via LinkedIn and firm website"
}
""",

    "indian_investors_v1": """
You are a research analyst specializing in Indian startup ecosystem and investment.

Research the following Indian investor:

Name: {{ Name }}
Company/Firm: {{ Company }}
{% if City %}City: {{ City }}{% endif %}

Find:
- Email: Business email
- Phone: Indian phone number (+91...)
- Website: Firm/personal website
- LinkedIn: LinkedIn profile
- AngelList: AngelList profile URL
- Bio: Professional background
- Investment Stage: Seed/Series A/B/etc.
- Focus Sectors: Technology/Healthcare/Fintech/etc.

Rules:
- Use LinkedIn, AngelList, Crunchbase, YourStory, Inc42, Entrackr as sources
- Return null for any field not publicly available
- Include confidence scores

Return valid JSON following the standard enrichment schema.
""",

    "startup_v1": """
You are a startup intelligence researcher.

Research the following startup company:

Company: {{ Company }}
{% if Website %}Website: {{ Website }}{% endif %}
{% if City %}City: {{ City }}{% endif %}

Find:
- CEO Email: CEO/Founder email
- CEO LinkedIn: CEO LinkedIn profile
- Company Email: General contact email
- Phone: Company phone number
- Headquarters: Full HQ address
- Founded Year: Year company was founded
- Funding Stage: Latest funding round
- Total Funding: Total funding raised
- Investors: Key investors (comma-separated)
- Employee Count: Approximate headcount
- Description: Company description (2-3 sentences)

Return valid JSON following the standard enrichment schema.
""",
}


class PromptManager:
    """
    Manages prompt templates for enrichment projects.
    Supports Jinja2 variable interpolation.
    """

    def __init__(self) -> None:
        self._templates: Dict[str, str] = dict(DEFAULT_TEMPLATES)
        self._jinja_env = Environment(
            undefined=StrictUndefined,
            autoescape=False,
            trim_blocks=True,
            lstrip_blocks=True,
        )

    def register_template(self, name: str, template_str: str) -> None:
        """Register a new or update an existing template."""
        # Validate the template compiles
        self._jinja_env.from_string(template_str)
        self._templates[name] = template_str
        logger.info("Prompt template registered", name=name)

    def get_template(self, name: str) -> Optional[str]:
        """Retrieve a template by name."""
        return self._templates.get(name)

    def list_templates(self) -> list[str]:
        """List all registered template names."""
        return list(self._templates.keys())

    def render(
        self,
        template_name: str,
        input_data: Dict[str, Any],
        target_columns: list[str] | None = None,
        extra_context: Dict[str, Any] | None = None,
    ) -> str:
        """
        Render a prompt template with the given context.
        Raises ValueError if template not found or rendering fails.
        """
        template_str = self._templates.get(template_name)
        if template_str is None:
            # Fall back to default
            template_str = self._templates.get("default")
            if template_str is None:
                raise ValueError(f"Prompt template {template_name!r} not found")

        context: Dict[str, Any] = dict(input_data)
        context["input_data"] = input_data
        context["target_columns"] = target_columns or []
        if extra_context:
            context.update(extra_context)

        try:
            template: Template = self._jinja_env.from_string(template_str)
            rendered = template.render(**context)
            return rendered.strip()
        except TemplateError as exc:
            logger.error("Prompt rendering failed", template=template_name, error=str(exc))
            # Fall back to simple format without Jinja for robustness
            return self._simple_render(template_str, context)

    def _simple_render(self, template_str: str, context: Dict[str, Any]) -> str:
        """Fallback simple {{ variable }} substitution without Jinja2."""
        result = template_str
        for key, value in context.items():
            result = result.replace(f"{{{{ {key} }}}}", str(value or ""))
        return result.strip()

    def preview(
        self,
        template_name: str,
        sample_data: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Preview a rendered prompt with sample data."""
        try:
            rendered = self.render(template_name, sample_data)
            return {
                "success": True,
                "rendered": rendered,
                "token_estimate": len(rendered.split()) * 1.3,  # rough estimate
            }
        except Exception as exc:
            return {"success": False, "error": str(exc), "rendered": None}

    def validate_template(self, template_str: str) -> Dict[str, Any]:
        """Validate a template string before saving."""
        try:
            tmpl = self._jinja_env.from_string(template_str)
            # Extract variables
            ast = self._jinja_env.parse(template_str)
            from jinja2 import meta
            variables = meta.find_undeclared_variables(ast)
            return {
                "valid": True,
                "variables": list(variables),
                "error": None,
            }
        except TemplateError as exc:
            return {"valid": False, "variables": [], "error": str(exc)}


# Global singleton prompt manager
prompt_manager = PromptManager()
