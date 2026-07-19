#!/usr/bin/env python3
"""Validate structural, accessibility, and production-profile SVG constraints.

This is a conservative baseline linter. It does not replace browser rendering,
visual inspection, WCAG review, factual review, or target-application testing.
"""

from __future__ import annotations

import argparse
import re
import sys
import xml.etree.ElementTree as ET
from collections import Counter
from pathlib import Path
from typing import Iterable


SVG_NS = "http://www.w3.org/2000/svg"
XLINK_NS = "http://www.w3.org/1999/xlink"
URL_REF_RE = re.compile(r"url\(\s*#([^\s)]+)\s*\)")
EXTERNAL_URL_RE = re.compile(r"(?:https?:)?//", re.IGNORECASE)
CSS_ANIMATION_RE = re.compile(r"(?:@keyframes|\banimation(?:-name)?\s*:)", re.IGNORECASE)
REDUCED_MOTION_RE = re.compile(r"prefers-reduced-motion\s*:\s*reduce", re.IGNORECASE)


PROFILE_FORBIDDEN = {
    "docs-inline": {
        "script",
        "foreignObject",
        "style",
        "filter",
        "mask",
        "animate",
        "animateMotion",
        "animateTransform",
        "set",
    },
    "docs-animated": {"script", "foreignObject", "animate", "animateMotion", "animateTransform", "set"},
    "web-inline": {"script", "foreignObject"},
    "standalone": {"script", "foreignObject"},
    "office": {
        "script",
        "foreignObject",
        "style",
        "filter",
        "mask",
        "marker",
        "animate",
        "animateMotion",
        "animateTransform",
        "set",
    },
    "print": {"script", "foreignObject", "animate", "animateMotion", "animateTransform", "set"},
    "icon": {"script", "foreignObject", "text", "image", "animate", "animateMotion", "animateTransform", "set"},
}


def local_name(name: str) -> str:
    """Return an XML expanded name without its namespace."""
    return name.rsplit("}", 1)[-1]


def iter_text(element: ET.Element) -> str:
    return "".join(element.itertext()).strip()


def attr_value(element: ET.Element, name: str) -> str | None:
    return element.attrib.get(name) or element.attrib.get(f"{{{XLINK_NS}}}{name}")


def parse_viewbox(value: str | None) -> tuple[float, float, float, float] | None:
    if not value:
        return None
    parts = re.split(r"[\s,]+", value.strip())
    if len(parts) != 4:
        return None
    try:
        numbers = tuple(float(part) for part in parts)
    except ValueError:
        return None
    if numbers[2] <= 0 or numbers[3] <= 0:
        return None
    return numbers  # type: ignore[return-value]


def find_elements(root: ET.Element, tag_name: str) -> list[ET.Element]:
    return [element for element in root.iter() if local_name(element.tag) == tag_name]


def collect_references(root: ET.Element) -> tuple[set[str], list[str]]:
    internal: set[str] = set()
    external: list[str] = []

    for element in root.iter():
        for raw_name, value in element.attrib.items():
            name = local_name(raw_name)
            internal.update(URL_REF_RE.findall(value))

            if name == "href":
                if value.startswith("#"):
                    internal.add(value[1:])
                elif not value.startswith("data:"):
                    external.append(value)
            elif EXTERNAL_URL_RE.search(value):
                external.append(value)

        if local_name(element.tag) == "style":
            style_text = iter_text(element)
            internal.update(URL_REF_RE.findall(style_text))
            if EXTERNAL_URL_RE.search(style_text):
                external.append("external URL in <style>")

    return internal, external


def validate(
    path: Path,
    profile: str,
    accessibility: str,
) -> tuple[list[str], list[str]]:
    errors: list[str] = []
    warnings: list[str] = []

    try:
        source = path.read_text(encoding="utf-8")
    except (OSError, UnicodeError) as exc:
        return [f"cannot read UTF-8 SVG: {exc}"], warnings

    try:
        root = ET.fromstring(source)
    except ET.ParseError as exc:
        return [f"malformed XML: {exc}"], warnings

    if local_name(root.tag) != "svg":
        errors.append("root element must be <svg>")
        return errors, warnings

    if not root.tag.startswith(f"{{{SVG_NS}}}"):
        errors.append(f'root <svg> must declare xmlns="{SVG_NS}"')

    if parse_viewbox(root.attrib.get("viewBox")) is None:
        errors.append("viewBox must contain four numbers with positive width and height")

    preserve = root.attrib.get("preserveAspectRatio")
    if preserve == "none" and profile not in {"web-inline"}:
        warnings.append("preserveAspectRatio=none may distort the illustration")

    elements = list(root.iter())
    tag_names = [local_name(element.tag) for element in elements]
    forbidden = PROFILE_FORBIDDEN[profile]
    for tag_name in sorted(forbidden.intersection(tag_names)):
        errors.append(f"<{tag_name}> is not allowed in the {profile} profile")

    for element in elements:
        tag_name = local_name(element.tag)
        for raw_name in element.attrib:
            name = local_name(raw_name)
            if name.lower().startswith("on"):
                errors.append(f"event attribute {name!r} is not allowed on <{tag_name}>")

    ids = [element.attrib["id"] for element in elements if "id" in element.attrib]
    duplicates = sorted(item for item, count in Counter(ids).items() if count > 1)
    for duplicate in duplicates:
        errors.append(f"duplicate id: {duplicate}")

    references, external_resources = collect_references(root)
    known_ids = set(ids)
    for missing in sorted(references - known_ids):
        errors.append(f"dangling internal reference: #{missing}")

    for resource in sorted(set(external_resources)):
        errors.append(f"external resource is not self-contained: {resource}")

    title_elements = find_elements(root, "title")
    desc_elements = find_elements(root, "desc")
    title = next((iter_text(element) for element in title_elements if iter_text(element)), "")
    description = next((iter_text(element) for element in desc_elements if iter_text(element)), "")
    role = root.attrib.get("role")
    aria_hidden = root.attrib.get("aria-hidden")
    labelledby = set(root.attrib.get("aria-labelledby", "").split())

    if accessibility == "decorative":
        if aria_hidden != "true":
            errors.append('decorative inline SVG must set aria-hidden="true"')
        if role == "img":
            warnings.append("decorative SVG should not expose role=img")
    else:
        if role != "img":
            errors.append('informative inline SVG must set role="img"')
        if not title:
            errors.append("informative SVG must contain a non-empty <title>")
        if title_elements and list(root).index(title_elements[0]) > 0:
            warnings.append("<title> should be the first child of <svg>")
        if accessibility == "complex" and not description:
            errors.append("complex SVG must contain a concise non-empty <desc>")

        title_ids = {element.attrib.get("id") for element in title_elements if element.attrib.get("id")}
        desc_ids = {element.attrib.get("id") for element in desc_elements if element.attrib.get("id")}
        if labelledby and not labelledby.issubset(known_ids):
            errors.append("aria-labelledby contains an ID that does not exist")
        if title_ids and not title_ids.intersection(labelledby):
            warnings.append("aria-labelledby does not reference the titled accessible name")
        if accessibility == "complex" and desc_ids and not desc_ids.intersection(labelledby):
            warnings.append("aria-labelledby does not reference <desc>")

    style_text = "\n".join(iter_text(element) for element in find_elements(root, "style"))
    if CSS_ANIMATION_RE.search(style_text) and not REDUCED_MOTION_RE.search(style_text):
        errors.append("CSS animation requires a prefers-reduced-motion: reduce fallback")

    if profile == "icon":
        if root.attrib.get("width") or root.attrib.get("height"):
            warnings.append("icon profile usually relies on viewBox plus host-controlled dimensions")
        if accessibility != "decorative" and not title:
            warnings.append("UI icons are often decorative beside a host control label")

    if len(elements) > 1000:
        warnings.append(f"SVG contains {len(elements)} elements; consider Canvas or geometry reuse")

    if "<metadata" in source or "inkscape:" in source or "sodipodi:" in source:
        warnings.append("editor metadata is present; remove it from the optimized delivery copy")

    return errors, warnings


def print_messages(kind: str, messages: Iterable[str]) -> None:
    for message in messages:
        print(f"{kind}: {message}", file=sys.stderr)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("svg", type=Path, help="SVG file to validate")
    parser.add_argument(
        "--profile",
        choices=sorted(PROFILE_FORBIDDEN),
        default="standalone",
        help="target production profile (default: standalone)",
    )
    parser.add_argument(
        "--accessibility",
        choices=("informative", "complex", "decorative"),
        default="informative",
        help="graphic purpose and accessible-name contract",
    )
    args = parser.parse_args()

    errors, warnings = validate(args.svg, args.profile, args.accessibility)
    print_messages("warning", warnings)
    print_messages("error", errors)

    if errors:
        print(
            f"FAIL: {args.svg} ({len(errors)} errors, {len(warnings)} warnings)",
            file=sys.stderr,
        )
        return 1

    print(f"PASS: {args.svg} ({len(warnings)} warnings)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())