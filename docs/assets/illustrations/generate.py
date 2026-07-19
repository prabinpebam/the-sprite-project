#!/usr/bin/env python3
"""Generate every project-facing documentation illustration as deterministic SVG."""

from __future__ import annotations

import argparse
import json
import math
import re
import xml.etree.ElementTree as ET
from html import escape
from pathlib import Path


OUT = Path(__file__).resolve().parent
DEFAULT_THEME = OUT / "theme.json"
SUFFIX = ""

FONT = "Segoe UI, Arial, sans-serif"
BG = "#FFFFFF"
SURFACE = "#FAFAFC"
SURFACE_ALT = "#F4F6F8"
INK = "#1F2937"
MUTED = "#5D6B7E"
LINE = "#64748B"
GRID = "#94A3B8"
SOFT = "#DDD6FE"
PURPLE = "#6D28D9"
PURPLE_2 = "#8B5CF6"
PURPLE_3 = "#DDD6FE"
ON_ACCENT = "#FFFFFF"
GREEN = "#15803D"
GREEN_SOFT = "#DCFCE7"
GREEN_INK = "#14532D"
AMBER = "#B45309"
RED = "#B91C1C"
CORNER_RADIUS = 10
PILL_RADIUS = 14
STROKE_SCALE = 1.0
CONNECTOR_WIDTH = 2.0
LINE_CAP = "round"
LINE_JOIN = "round"
DASH: list[float] = []


MOTION_CSS = """
    .svg-play:target .motion-enter,
    .svg-play:target .motion-grow,
    .svg-play:target .motion-ring,
    .svg-play:target .motion-draw { opacity: 0; }
    .svg-play:target .motion-enter {
            transform-box: fill-box; transform-origin: center;
            animation: svg-enter 520ms cubic-bezier(.2,.7,.2,1) both;
            animation-delay: calc(100ms + var(--i) * 38ms);
        }
        .svg-play:target .motion-grow {
            transform-box: fill-box; transform-origin: left center;
            animation: svg-grow 620ms cubic-bezier(.2,.7,.2,1) both;
            animation-delay: calc(120ms + var(--i) * 55ms);
        }
        .svg-play:target .motion-ring {
            transform-box: fill-box; transform-origin: center;
            animation: svg-ring 650ms cubic-bezier(.2,.7,.2,1) both;
            animation-delay: calc(100ms + var(--i) * 100ms);
        }
        .svg-play:target .motion-draw {
            stroke-dasharray: 1200; stroke-dashoffset: 1200;
            animation: svg-draw 760ms cubic-bezier(.2,.7,.2,1) both;
            animation-delay: calc(160ms + var(--i) * 38ms);
        }
        .svg-play:target .motion-highlight {
            transform-box: fill-box; transform-origin: center;
            animation: svg-highlight 850ms cubic-bezier(.2,.7,.2,1) 2;
            animation-delay: 1250ms;
        }
        .svg-play:target .motion-active-loop {
            transform-box: fill-box; transform-origin: center;
            animation: svg-active 2200ms ease-in-out 1500ms infinite;
        }
        .svg-play:target .motion-flow-loop {
            stroke-dasharray: 10 8;
            animation: svg-flow 1100ms linear 1300ms infinite;
        }
        .svg-play:target .motion-light-loop {
            transform-box: fill-box; transform-origin: center;
            animation: svg-light 2600ms ease-in-out 1200ms infinite;
        }
        .svg-play:target .motion-enter.motion-highlight {
            animation: svg-enter 520ms cubic-bezier(.2,.7,.2,1) both,
                                 svg-highlight 850ms cubic-bezier(.2,.7,.2,1) 1250ms 2;
            animation-delay: calc(100ms + var(--i) * 38ms), 1250ms;
        }
        .svg-play:target .motion-ring.motion-highlight {
            animation: svg-ring 650ms cubic-bezier(.2,.7,.2,1) both,
                                 svg-highlight 850ms cubic-bezier(.2,.7,.2,1) 1250ms 2;
            animation-delay: calc(100ms + var(--i) * 100ms), 1250ms;
        }
        .svg-play:target .motion-enter.motion-active-loop {
            animation: svg-enter 520ms cubic-bezier(.2,.7,.2,1) both,
                                 svg-active 2200ms ease-in-out 1500ms infinite;
            animation-delay: calc(100ms + var(--i) * 38ms), 1500ms;
        }
        .svg-play:target .motion-draw.motion-flow-loop {
            animation: svg-draw 760ms cubic-bezier(.2,.7,.2,1) both,
                                 svg-flow 1100ms linear 1300ms infinite;
            animation-delay: calc(160ms + var(--i) * 38ms), 1300ms;
        }
        .svg-play:target .motion-enter.motion-light-loop {
            animation: svg-enter 520ms cubic-bezier(.2,.7,.2,1) both,
                                 svg-light 2600ms ease-in-out 1200ms infinite;
            animation-delay: calc(100ms + var(--i) * 38ms), 1200ms;
        }
        .svg-play:target .motion-sequence.motion-enter {
            animation-delay: calc(140ms + var(--step) * 140ms);
        }
        .svg-play:target .motion-sequence.motion-draw {
            animation-delay: calc(140ms + var(--step) * 140ms);
        }
        .svg-play:target .motion-sequence.motion-enter.motion-highlight {
            animation-delay: calc(140ms + var(--step) * 140ms), calc(500ms + var(--step) * 140ms);
        }
        .svg-play:target .motion-sequence.motion-draw.motion-flow-loop {
            animation-delay: calc(140ms + var(--step) * 140ms), calc(650ms + var(--step) * 140ms);
        }
        .svg-play:target .motion-sequence.motion-enter.motion-active-loop {
            animation: svg-enter 520ms cubic-bezier(.2,.7,.2,1) both,
                                 svg-active 2200ms ease-in-out infinite;
            animation-delay: calc(140ms + var(--step) * 140ms), calc(650ms + var(--step) * 140ms);
        }
        .svg-play:target .motion-sequence.motion-enter.motion-light-loop {
            animation: svg-enter 520ms cubic-bezier(.2,.7,.2,1) both,
                                 svg-light 2600ms ease-in-out infinite;
            animation-delay: calc(140ms + var(--step) * 140ms), calc(650ms + var(--step) * 140ms);
        }
        @keyframes svg-enter {
            from { opacity: 0; transform: translateY(10px) scale(.985); }
            to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes svg-grow {
            from { opacity: .35; transform: scaleX(0); }
            to { opacity: 1; transform: scaleX(1); }
        }
        @keyframes svg-ring {
            from { opacity: 0; transform: scale(.72); }
            to { opacity: 1; transform: scale(1); }
        }
        @keyframes svg-draw {
            from { opacity: .25; stroke-dashoffset: 1200; }
            to { opacity: 1; stroke-dashoffset: 0; }
        }
        @keyframes svg-highlight {
            0%, 100% { transform: scale(1); filter: brightness(1); }
            50% { transform: scale(1.045); filter: brightness(1.12); }
        }
        @keyframes svg-active {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.06); opacity: .82; }
        }
        @keyframes svg-flow { to { stroke-dashoffset: -36; } }
        @keyframes svg-light {
            0%, 100% { transform: scale(1); opacity: .88; }
            50% { transform: scale(1.12); opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
            .motion-stage * {
                animation: none !important; opacity: 1 !important; transform: none !important;
                filter: none !important; stroke-dashoffset: 0 !important;
            }
        }
"""


def number(element: ET.Element, name: str, default: float = 0) -> float:
        try:
                return float(element.attrib.get(name, default))
        except ValueError:
                return default


def add_motion_class(element: ET.Element, class_name: str) -> None:
    classes = element.attrib.get("class", "").split()
    if class_name not in classes:
        classes.append(class_name)
    element.set("class", " ".join(classes))


def set_sequence(element: ET.Element, step: int) -> None:
    add_motion_class(element, "motion-sequence")
    element.set("style", f"--step:{step};--i:{min(step, 24)}")


def element_center(element: ET.Element) -> tuple[float, float]:
    if element.tag == "circle":
        return number(element, "cx"), number(element, "cy")
    if element.tag in {"rect", "text"}:
        return number(element, "x") + number(element, "width") / 2, number(element, "y") + number(element, "height") / 2
    if element.tag == "line":
        return (number(element, "x1") + number(element, "x2")) / 2, (number(element, "y1") + number(element, "y2")) / 2
    source = element.attrib.get("points") or element.attrib.get("d") or ""
    values = [float(value) for value in re.findall(r"-?\d+(?:\.\d+)?", source)]
    if len(values) >= 2:
        xs, ys = values[0::2], values[1::2]
        return sum(xs) / len(xs), sum(ys) / len(ys)
    return 0, 0


def apply_motion(body: str, slug: str) -> str:
    root = ET.fromstring(f"<root>{body}</root>")
    children = list(root)
    for index, element in enumerate(children):
        tag = element.tag
        element.set("style", f"--i:{min(index, 24)}")
        if tag in {"path", "line", "polyline"} and element.attrib.get("stroke", "none") != "none":
            add_motion_class(element, "motion-draw")
        elif tag in {"rect", "circle", "polygon", "text"}:
            add_motion_class(element, "motion-enter")

    if slug in {"github-stars", "horse-animation-timing"}:
        for element in children:
            if element.tag == "rect" and number(element, "height") <= 30 and number(element, "width") > 5:
                add_motion_class(element, "motion-grow")
                element.attrib["class"] = element.attrib["class"].replace("motion-enter", "").strip()
        row_y = [68 + index * 48 for index in range(6)] if slug == "github-stars" else [70 + index * 52 for index in range(4)]
        for step, y in enumerate(row_y):
            for element in children:
                _, center_y = element_center(element)
                if y - 8 <= center_y <= y + 32:
                    set_sequence(element, step)

    if slug in {"product-architecture", "north-star-studio"}:
        for element in children:
            _, y = element_center(element)
            if element.tag in {"path", "line", "polygon"}:
                step = 1 if y < 165 else 3 if y < 300 else 5
            else:
                step = 0 if y < 140 else 2 if y < 270 else 4 if y < 390 else 6
            set_sequence(element, step)

    if slug == "composition-data-flow":
        for element in children:
            x, y = element_center(element)
            if element.tag in {"path", "line", "polygon"}:
                step = 1 if x < 610 else 3
            elif x < 300:
                step = 0
            elif x < 640 and y < 250:
                step = 2
            else:
                step = 4
            set_sequence(element, step)

    if slug == "token-resolution":
        for element in children:
            x, y = element_center(element)
            base = 0 if y < 180 else 5
            if x < 245:
                step = base
            elif x < 305:
                step = base + 1
            elif x < 610:
                step = base + 2
            elif x < 675:
                step = base + 3
            else:
                step = base + 4
            set_sequence(element, step)

    if slug == "mvp-expansion":
        circles = [element for element in children if element.tag == "circle"]
        for index, element in enumerate(sorted(circles, key=lambda item: number(item, "r"))):
            add_motion_class(element, "motion-ring")
            element.attrib["class"] = element.attrib["class"].replace("motion-enter", "").strip()
            set_sequence(element, index)
        core = next((element for element in circles if number(element, "cx") == 300 and number(element, "r") == 55), None)
        if core is not None:
            add_motion_class(core, "motion-highlight")

    if slug in {"mvp-character-journey", "delivery-roadmap"}:
        circles = [element for element in children if element.tag == "circle"]
        for index, element in enumerate(circles):
            element.set("style", f"--i:{index}")
        if slug == "mvp-character-journey":
            for element in [item for item in circles if number(item, "cx") > 900]:
                add_motion_class(element, "motion-highlight")
            centers = [75 + index * 142 for index in range(7)]
            for index, center in enumerate(centers):
                step = index * 2
                for element in children:
                    if element.tag == "circle" and number(element, "cx") == center:
                        set_sequence(element, step)
                    if element.tag == "text" and number(element, "x") == center:
                        set_sequence(element, step)
            connector_paths = [element for element in children if element.tag == "path"]
            connector_heads = [element for element in children if element.tag == "polygon"]
            for index, element in enumerate(connector_paths):
                set_sequence(element, index * 2 + 1)
            for index, element in enumerate(connector_heads):
                set_sequence(element, index * 2 + 1)
            for element in children:
                if element.tag in {"rect", "text"} and number(element, "y") >= 220:
                    set_sequence(element, 14)
        else:
            phase_centers = [95 + index * 162 for index in range(6)]
            for index, center in enumerate(phase_centers):
                for element in children:
                    if element.tag == "circle" and number(element, "cx") == center:
                        set_sequence(element, index)
                    if element.tag == "text" and number(element, "x") == center:
                        set_sequence(element, index)
            for element in [item for item in circles if number(item, "cx") == 95]:
                add_motion_class(element, "motion-active-loop")

    if slug == "token-resolution":
        for element in [item for item in children if item.tag == "rect" and number(item, "x") == 680]:
            add_motion_class(element, "motion-highlight")

    if slug == "ulpc-capability-coverage":
        status = [element for element in children if element.tag == "circle" and number(element, "r") == 9]
        for index, element in enumerate(status):
            element.set("style", f"--i:{index}")
        for element in status[:3]:
            add_motion_class(element, "motion-highlight")
        for step in range(15):
            row_y = 92 + step * 36
            for element in children:
                _, y = element_center(element)
                if row_y - 20 <= y <= row_y + 14:
                    set_sequence(element, step)

    if slug == "lpc-license-obligations":
        for index, element in enumerate(item for item in children if item.tag == "circle"):
            element.set("style", f"--i:{index}")
        for step in range(5):
            row_y = 92 + step * 58
            for element in children:
                _, y = element_center(element)
                if row_y - 22 <= y <= row_y + 14:
                    set_sequence(element, step)

    if slug == "sprite-pipeline-pain-ranking":
        ranks = [element for element in children if element.tag == "circle"]
        for index, element in enumerate(ranks):
            element.set("style", f"--i:{index}")
        for element in ranks[:2]:
            add_motion_class(element, "motion-highlight")
        for step in range(10):
            row_y = 70 + step * 48
            for element in children:
                _, y = element_center(element)
                if row_y - 20 <= y <= row_y + 15:
                    set_sequence(element, step)

    if slug == "lpc-shadow-guide":
        for element in children:
            x, y = element_center(element)
            if y >= 65:
                set_sequence(element, 0 if x < 680 else 1)

    if slug == "manual-vs-live-link":
        manual_centers = [100, 290, 480, 670, 860]
        for index, center in enumerate(manual_centers):
            step = index * 2
            for element in children:
                if element.tag == "rect" and number(element, "y") == 62 and number(element, "x") + number(element, "width") / 2 == center:
                    set_sequence(element, step)
                if element.tag == "text" and number(element, "x") == center and number(element, "y") > 60:
                    set_sequence(element, step)
        manual_paths = [element for element in children if element.tag == "path" and element.attrib.get("stroke") == RED]
        manual_heads = [element for element in children if element.tag == "polygon" and element.attrib.get("fill") == RED]
        for index, element in enumerate(manual_paths):
            set_sequence(element, index * 2 + 1)
        for index, element in enumerate(manual_heads):
            set_sequence(element, index * 2 + 1)
        for element in children:
            if element.tag == "text" and number(element, "y") >= 180:
                set_sequence(element, 9)
            if element.tag in {"rect", "text"} and number(element, "x") in {100, 190} and number(element, "y") >= 210:
                set_sequence(element, 10)
            if element.tag == "path" and element.attrib.get("stroke") == GREEN:
                set_sequence(element, 11)
            if element.tag == "polygon" and element.attrib.get("fill") == GREEN:
                set_sequence(element, 11)
            if element.tag in {"rect", "text"} and number(element, "x") in {390, 640} and number(element, "y") >= 200:
                set_sequence(element, 12)
        for element in children:
            if element.tag == "path" and element.attrib.get("stroke") == GREEN:
                add_motion_class(element, "motion-flow-loop")

    if slug == "lpc-shadow-guide":
        sun = next((element for element in children if element.tag == "circle" and number(element, "cx") == 760), None)
        if sun is not None:
            add_motion_class(sun, "motion-light-loop")

    return "".join(ET.tostring(element, encoding="unicode") for element in children)


def apply_theme(theme: dict, mode_name: str) -> None:
    global FONT, BG, SURFACE, SURFACE_ALT, INK, MUTED, LINE, GRID, SOFT
    global PURPLE, PURPLE_2, PURPLE_3, ON_ACCENT, GREEN, GREEN_SOFT, GREEN_INK
    global AMBER, RED, CORNER_RADIUS, PILL_RADIUS, STROKE_SCALE, CONNECTOR_WIDTH
    global LINE_CAP, LINE_JOIN, DASH, SUFFIX

    mode = theme["modes"][mode_name]
    appearance = theme["appearance"]
    FONT = appearance["fontFamily"]
    BG = mode["canvas"]
    SURFACE = mode["surface"]
    SURFACE_ALT = mode["surfaceAlt"]
    INK = mode["text"]
    MUTED = mode["textMuted"]
    LINE = mode["line"]
    GRID = mode["grid"]
    SOFT = mode["accentMuted"]
    PURPLE = mode["accent"]
    PURPLE_2 = mode["accentSecondary"]
    PURPLE_3 = mode["accentMuted"]
    ON_ACCENT = mode["onAccent"]
    GREEN = mode["positive"]
    GREEN_SOFT = mode["positiveSurface"]
    GREEN_INK = mode["onPositiveSurface"]
    AMBER = mode["warning"]
    RED = mode["danger"]
    CORNER_RADIUS = appearance["cornerRadius"]
    PILL_RADIUS = appearance["pillRadius"]
    STROKE_SCALE = appearance["strokeWidth"] / 2
    CONNECTOR_WIDTH = appearance["connectorWidth"]
    LINE_CAP = appearance["lineCap"]
    LINE_JOIN = appearance["lineJoin"]
    DASH = appearance["dash"]
    SUFFIX = "" if mode_name == "light" else f"-{mode_name}"


def text(x, y, value, size=14, fill=None, anchor="start", weight=400, opacity=None):
    fill = INK if fill is None else fill
    attrs = [
        f'x="{x}"', f'y="{y}"', f'font-family="{FONT}"', f'font-size="{size}"',
        f'font-weight="{weight}"', f'fill="{fill}"', f'text-anchor="{anchor}"',
    ]
    if opacity is not None:
        attrs.append(f'opacity="{opacity}"')
    return f'<text {" ".join(attrs)}>{escape(str(value))}</text>'


def multiline(x, y, lines, size=14, fill=None, anchor="middle", weight=400, line_height=18):
    fill = INK if fill is None else fill
    spans = []
    for index, line in enumerate(lines):
        dy = 0 if index == 0 else line_height
        spans.append(f'<tspan x="{x}" dy="{dy}">{escape(str(line))}</tspan>')
    return (
        f'<text x="{x}" y="{y}" font-family="{FONT}" font-size="{size}" font-weight="{weight}" '
        f'fill="{fill}" text-anchor="{anchor}">{"".join(spans)}</text>'
    )


def rounded_rect(x, y, width, height, fill=None, stroke=None, stroke_width=2, radius=None, pill_shape=False):
    fill = BG if fill is None else fill
    stroke = LINE if stroke is None else stroke
    radius_limit = PILL_RADIUS if pill_shape else CORNER_RADIUS
    radius = radius_limit if radius is None else min(radius, radius_limit)
    return (
        f'<rect x="{x}" y="{y}" width="{width}" height="{height}" rx="{radius}" '
        f'fill="{fill}" stroke="{stroke}" stroke-width="{stroke_width}" />'
    )


def pill(x, y, width, label, fill=None, ink=None, stroke=None):
    fill = SOFT if fill is None else fill
    ink = PURPLE if ink is None else ink
    stroke = PURPLE if stroke is None else stroke
    return "".join([
        rounded_rect(x, y, width, 28, fill, stroke, 1, PILL_RADIUS, True),
        text(x + width / 2, y + 19, label, 12, ink, "middle", 600),
    ])


def dash_attribute() -> str:
    return f' stroke-dasharray="{" ".join(str(value) for value in DASH)}"' if DASH else ""


def arrow_right(x1, y, x2, color=None, width=None):
    color = MUTED if color is None else color
    width = CONNECTOR_WIDTH if width is None else width
    tip = x2
    return (
        f'<path d="M {x1} {y} H {tip - 10}" fill="none" stroke="{color}" stroke-width="{width}" '
        f'stroke-linecap="{LINE_CAP}"{dash_attribute()} />'
        f'<polygon points="{tip - 10},{y - 5} {tip},{y} {tip - 10},{y + 5}" fill="{color}" />'
    )


def arrow_down(x, y1, y2, color=None, width=None):
    color = MUTED if color is None else color
    width = CONNECTOR_WIDTH if width is None else width
    return (
        f'<path d="M {x} {y1} V {y2 - 10}" fill="none" stroke="{color}" stroke-width="{width}" '
        f'stroke-linecap="{LINE_CAP}"{dash_attribute()} />'
        f'<polygon points="{x - 5},{y2 - 10} {x},{y2} {x + 5},{y2 - 10}" fill="{color}" />'
    )


def svg_document(title, description, width, height, body, slug):
    title_id = "figure-title"
    desc_id = "figure-desc"
    if STROKE_SCALE == 1:
        body = apply_motion(body, slug)
        return f'''<svg id="svg-play" class="svg-play" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}"
     role="img" aria-labelledby="{title_id} {desc_id}" preserveAspectRatio="xMidYMid meet">
  <title id="{title_id}">{escape(title)}</title>
  <desc id="{desc_id}">{escape(description)}</desc>
  <style>{MOTION_CSS}</style>
  <rect width="{width}" height="{height}" fill="{BG}" />
  <g class="motion-stage" stroke-linecap="{LINE_CAP}" stroke-linejoin="{LINE_JOIN}">{body}</g>
</svg>
'''
    if STROKE_SCALE != 1:
        body = re.sub(
            r'stroke-width="([0-9.]+)"',
            lambda match: f'stroke-width="{float(match.group(1)) * STROKE_SCALE:g}"',
            body,
        )
        body = apply_motion(body, slug)
        return f'''<svg id="svg-play" class="svg-play" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}"
     role="img" aria-labelledby="{title_id} {desc_id}" preserveAspectRatio="xMidYMid meet">
  <title id="{title_id}">{escape(title)}</title>
  <desc id="{desc_id}">{escape(description)}</desc>
    <style>{MOTION_CSS}</style>
  <rect width="{width}" height="{height}" fill="{BG}" />
    <g class="motion-stage" stroke-linecap="{LINE_CAP}" stroke-linejoin="{LINE_JOIN}">{body}</g>
</svg>
'''


def write(name, title, description, width, height, body):
    path = Path(name)
    output_name = f"{path.stem}{SUFFIX}{path.suffix}"
    (OUT / output_name).write_text(svg_document(title, description, width, height, body, path.stem), encoding="utf-8")


def node(x, y, width, height, lines, active=False, accent=False, small=False):
    if active:
        fill, stroke, ink = PURPLE, PURPLE, ON_ACCENT
    elif accent:
        fill, stroke, ink = GREEN_SOFT, GREEN, GREEN_INK
    else:
        fill, stroke, ink = BG, PURPLE_3, INK
    line_height = 17 if small else 19
    size = 12 if small else 14
    start_y = y + height / 2 - ((len(lines) - 1) * line_height) / 2 + size * 0.36
    return "".join([
        rounded_rect(x, y, width, height, fill, stroke, 2, 10),
        multiline(x + width / 2, start_y, lines, size, ink, "middle", 600, line_height),
    ])


def product_architecture():
    parts = [
        text(500, 26, "SPECIALIZED PRODUCERS", 12, MUTED, "middle", 700),
    ]
    producer_x = [55, 360, 665]
    producer_labels = [("Character", "generator"), ("Environment", "terrain"), ("Structures", "props")]
    for x, labels in zip(producer_x, producer_labels):
        parts.append(node(x, 44, 280, 62, labels, active=True))
        parts.append(f'<path d="M {x + 140} 106 V 136" stroke="{LINE}" stroke-width="2" fill="none" />')
    parts.extend([
        f'<path d="M 195 136 H 805" stroke="{LINE}" stroke-width="2" fill="none" />',
        text(500, 153, "SHARED SYSTEMS", 12, MUTED, "middle", 700),
        arrow_down(320, 136, 172, PURPLE, 2),
        arrow_down(680, 136, 172, PURPLE, 2),
        node(170, 172, 300, 60, ("Token style system",), small=False),
        node(530, 172, 300, 60, ("Manual editor",), small=False),
        f'<path d="M 320 232 V 254 H 500" stroke="{LINE}" stroke-width="2" fill="none" />',
        f'<path d="M 680 232 V 254 H 500" stroke="{LINE}" stroke-width="2" fill="none" />',
        arrow_down(500, 254, 278, PURPLE, 2),
        node(350, 278, 300, 62, ("One versioned project", "assets · tokens · licenses"), active=False),
        arrow_down(500, 340, 370, PURPLE, 2),
        pill(280, 370, 440, "Unified export · live link · CLI / API", GREEN_SOFT, GREEN_INK, GREEN),
    ])
    write(
        "product-architecture.svg",
        "Product architecture at a glance",
        "Three specialized generators feed two shared systems, then one versioned project and one export pipeline.",
        1000, 430, "".join(parts),
    )


def composition_flow():
    parts = [text(500, 26, "ONE PROJECT, MANY PRODUCERS", 13, MUTED, "middle", 700)]
    ys = [70, 155, 240]
    labels = [("Character", "generator"), ("Environment", "generator"), ("Structures", "generator")]
    for y, label in zip(ys, labels):
        parts.append(node(35, y, 220, 58, label, active=True, small=True))
        parts.append(f'<path d="M 255 {y + 29} H 292" stroke="{LINE}" stroke-width="2" fill="none" />')
    parts.extend([
        f'<path d="M 292 99 V 269" stroke="{LINE}" stroke-width="2" fill="none" />',
        arrow_right(292, 184, 335, PURPLE, 2),
        node(335, 140, 260, 88, ("Shared project", "assets · tokens", "licenses · recipes")),
        arrow_right(595, 184, 640, PURPLE, 2),
    ])
    export_ys = [70, 155, 240]
    export_labels = [("Files", "PNG · JSON"), ("Live link", "engine target"), ("CLI / API", "automation")]
    parts.append(f'<path d="M 640 99 V 269" stroke="{LINE}" stroke-width="2" fill="none" />')
    for y, label in zip(export_ys, export_labels):
        parts.append(f'<path d="M 640 {y + 29} H 680" stroke="{LINE}" stroke-width="2" fill="none" />')
        parts.append(node(680, y, 280, 58, label, small=True))
    parts.extend([
        arrow_down(465, 228, 275, PURPLE, 2),
        node(335, 275, 260, 60, ("Scene / composition", "optional verification context"), accent=True, small=True),
    ])
    write(
        "composition-data-flow.svg",
        "Composition data flow",
        "Three producers write to one shared project, which supports scene composition and three export adapters.",
        1000, 370, "".join(parts),
    )


def token_resolution():
    ramps = [
        ("SUMMER THEME", ["#1E3A1E", "#2F5A2A", "#4A8B3A", "#6FB84E", "#A5E06A"], "#4A8B3A"),
        ("AUTUMN THEME", ["#5A2A12", "#8A4A1E", "#C67A2A", "#E0A54E", "#F0D06A"], "#C67A2A"),
    ]
    parts = [
        text(500, 28, "THE TOKEN STAYS THE SAME; THE RAMP BINDING CHANGES", 13, MUTED, "middle", 700),
    ]
    for index, (label, colors, resolved) in enumerate(ramps):
        y = 58 + index * 150
        parts.extend([
            rounded_rect(30, y, 940, 118, SURFACE, LINE, 1, 12),
            text(60, y + 25, label, 11, MUTED, "start", 700),
            pill(60, y + 45, 170, "foliage.mid", PURPLE, ON_ACCENT, PURPLE),
            arrow_right(244, y + 59, 292, MUTED, 2),
            text(310, y + 42, "5-step ramp", 11, MUTED, "start", 600),
        ])
        for color_index, color in enumerate(colors):
            x = 310 + color_index * 58
            stroke = INK if color_index == 2 else SURFACE
            stroke_width = 3 if color_index == 2 else 1
            parts.append(rounded_rect(x, y + 50, 46, 46, color, stroke, stroke_width, 7))
        parts.extend([
            arrow_right(606, y + 73, 660, MUTED, 2),
            rounded_rect(680, y + 42, 72, 64, resolved, INK, 2, 10),
            multiline(790, y + 62, ("resolved", "color"), 13, INK, "start", 600, 18),
        ])
    write(
        "token-resolution.svg",
        "Token resolution through ramps to palette colors",
        "The foliage.mid token resolves to the middle color of either a summer green ramp or an autumn orange ramp.",
        1000, 350, "".join(parts),
    )


def expansion_rings():
    cx, cy = 300, 235
    rings = [
        (190, SURFACE_ALT, PURPLE_3),
        (145, SURFACE, PURPLE_2),
        (100, SOFT, PURPLE),
        (55, PURPLE, PURPLE),
    ]
    parts = [text(500, 28, "THE MVP CORE PERSISTS THROUGH EVERY EXPANSION", 13, MUTED, "middle", 700)]
    for radius, fill, stroke in rings:
        parts.append(f'<circle cx="{cx}" cy="{cy}" r="{radius}" fill="{fill}" stroke="{stroke}" stroke-width="2" />')
    parts.extend([
        multiline(cx, cy - 6, ("Character", "MVP"), 14, ON_ACCENT, "middle", 700, 18),
    ])
    labels = [
        (90, "MVP core", "project · packs · tokens · export", PURPLE),
        (180, "Content ecosystem", "pack authoring · richer characters", PURPLE),
        (270, "World producers", "terrain · structures · composition", PURPLE_2),
        (360, "North Star studio", "editing · maps · live links · automation", PURPLE_3),
    ]
    for y, title, detail, color in labels:
        parts.extend([
            f'<circle cx="580" cy="{y}" r="7" fill="{color}" />',
            f'<path d="M {cx + 55 + (y - 90) / 2} {cy - 35 + (y - 90) * 0.24} C 500 {y} 520 {y} 558 {y}" '
            f'fill="none" stroke="{color}" stroke-width="2" />',
            text(605, y - 3, title, 15, INK, "start", 700),
            text(605, y + 18, detail, 12, MUTED, "start", 400),
        ])
    write(
        "mvp-expansion.svg",
        "MVP expanding toward the North Star",
        "Concentric layers show the character MVP at the core, followed by the content ecosystem, world producers, and the complete studio.",
        1000, 470, "".join(parts),
    )


def mvp_journey():
    steps = [
        ("Create", "project"), ("Compose", "from packs"), ("Apply", "tokens"), ("Preview", "animation"),
        ("Save", "recipe"), ("Export", "for Godot"), ("Use", "in a game"),
    ]
    parts = [text(500, 28, "ONE COMPLETE CHARACTER-TO-ENGINE JOURNEY", 13, MUTED, "middle", 700)]
    centers = [75 + index * 142 for index in range(len(steps))]
    for index in range(len(centers) - 1):
        parts.append(arrow_right(centers[index] + 36, 112, centers[index + 1] - 36, LINE, 3))
    for index, ((line1, line2), cx) in enumerate(zip(steps, centers), start=1):
        accent = index == len(steps)
        color = GREEN if accent else PURPLE
        fill = GREEN_SOFT if accent else SOFT
        parts.extend([
            f'<circle cx="{cx}" cy="112" r="36" fill="{fill}" stroke="{color}" stroke-width="3" />',
            f'<circle cx="{cx}" cy="112" r="13" fill="{color}" />',
            text(cx, 116, index, 11, ON_ACCENT, "middle", 700),
            multiline(cx, 174, (line1, line2), 13, INK, "middle", 600, 18),
        ])
    parts.append(pill(300, 220, 400, "Spritesheet · animation data · exact credits", GREEN_SOFT, GREEN_INK, GREEN))
    write(
        "mvp-character-journey.svg",
        "MVP character-to-engine workflow",
        "Seven steps run from creating a project through composing, recoloring, previewing, saving, exporting, and using a character in a game.",
        1000, 280, "".join(parts),
    )


def north_star():
    parts = [text(500, 26, "SPECIALIZED PRODUCERS, ONE SHARED STUDIO", 13, MUTED, "middle", 700)]
    producer_x = [50, 365, 680]
    producer_labels = [("Character generator", "MVP starts here"), ("Environment & terrain", "second producer"), ("Structures & props", "world completion")]
    for index, (x, label) in enumerate(zip(producer_x, producer_labels)):
        parts.append(node(x, 48, 270, 62, label, active=index == 0, small=True))
        parts.append(f'<path d="M {x + 135} 110 V 142" stroke="{LINE}" stroke-width="2" />')
    parts.extend([
        f'<path d="M 185 142 H 815" stroke="{LINE}" stroke-width="2" fill="none" />',
        arrow_down(500, 142, 165, PURPLE, 2),
        node(355, 165, 290, 70, ("One versioned project", "assets · recipes · tokens · licenses")),
        arrow_down(500, 235, 270, PURPLE, 2),
        rounded_rect(35, 270, 930, 100, SURFACE, LINE, 1, 12),
        text(65, 296, "SHARED CAPABILITIES", 11, MUTED, "start", 700),
    ])
    capabilities = ["Token coherence", "Manual editor", "Animation", "Material maps", "Provenance"]
    for index, capability in enumerate(capabilities):
        parts.append(pill(65 + index * 178, 316, 158, capability, SOFT, PURPLE, PURPLE_3))
    parts.extend([
        f'<path d="M 500 370 V 388 H 305 V 392" stroke="{LINE}" stroke-width="2" fill="none" />',
        f'<path d="M 500 388 H 695 V 392" stroke="{LINE}" stroke-width="2" fill="none" />',
        arrow_down(305, 392, 402, PURPLE, 2),
        arrow_down(695, 392, 402, PURPLE, 2),
        node(155, 402, 300, 62, ("Scene & composition", "verify the whole world"), accent=True, small=True),
        node(545, 402, 300, 62, ("Shared export pipeline", "files · engines · live link · CLI"), accent=True, small=True),
    ])
    write(
        "north-star-studio.svg",
        "North Star product architecture",
        "Three specialized producers feed one project and five shared capabilities, then scene composition and a shared export pipeline.",
        1000, 500, "".join(parts),
    )


def delivery_roadmap():
    phases = [
        ("Prove", "foundation"), ("Complete", "vertical slice"), ("Validate", "and release"),
        ("Open", "ecosystem"), ("Build", "worlds"), ("Complete", "studio"),
    ]
    parts = [
        text(500, 28, "EVIDENCE-GATED DELIVERY", 13, MUTED, "middle", 700),
        rounded_rect(35, 55, 465, 188, GREEN_SOFT, GREEN, 2, 14),
        text(60, 82, "MVP BOUNDARY · PHASES 1–3", 11, GREEN, "start", 700),
        f'<path d="M 95 145 H 905" stroke="{LINE}" stroke-width="4" stroke-linecap="round" />',
    ]
    centers = [95 + index * 162 for index in range(6)]
    for index, (cx, labels) in enumerate(zip(centers, phases), start=1):
        if index == 1:
            fill, stroke, number_fill = GREEN_SOFT, GREEN, GREEN
        elif index <= 3:
            fill, stroke, number_fill = SOFT, PURPLE, PURPLE
        else:
            fill, stroke, number_fill = BG, PURPLE_3, PURPLE_2
        parts.extend([
            f'<circle cx="{cx}" cy="145" r="34" fill="{fill}" stroke="{stroke}" stroke-width="3" />',
            f'<circle cx="{cx}" cy="145" r="13" fill="{number_fill}" />',
            text(cx, 149, index, 11, ON_ACCENT, "middle", 700),
            multiline(cx, 205, labels, 12, INK, "middle", 600, 17),
        ])
    parts.extend([
        pill(55, 265, 280, "Active: working pack → export spike", GREEN_SOFT, GREEN_INK, GREEN),
        text(500, 315, "Advance only when the phase exit gate is demonstrated.", 13, MUTED, "middle", 600),
    ])
    write(
        "delivery-roadmap.svg",
        "Phased roadmap from MVP to North Star",
        "Six evidence-gated phases progress from proving the foundation to completing the studio; the first three form the MVP boundary.",
        1000, 350, "".join(parts),
    )


def stars_chart():
    rows = [
        ("Universal LPC Generator", 1400), ("LPC Revised", 191), ("Phaser 3 LPC Character", 8),
        ("Vitruvian spritesheets", 5), ("lpcg (Rust)", 4), ("Gaurav0 fork", 4),
    ]
    x0, plot_width, max_value = 300, 600, 1400
    parts = [
        text(30, 28, "COMMUNITY TRACTION", 13, MUTED, "start", 700),
        text(970, 28, "logarithmic scale", 11, MUTED, "end", 400),
    ]
    ticks = [1, 10, 100, 1000]
    for tick in ticks:
        x = x0 + math.log10(tick) / math.log10(max_value) * plot_width
        parts.extend([
            f'<line x1="{x:.1f}" y1="48" x2="{x:.1f}" y2="350" stroke="{GRID}" stroke-width="1" />',
            text(round(x, 1), 372, f"{tick:,}", 11, MUTED, "middle", 400),
        ])
    for index, (label, value) in enumerate(rows):
        y = 68 + index * 48
        width = max(8, math.log10(value) / math.log10(max_value) * plot_width)
        fill = PURPLE if index == 0 else PURPLE_2 if index == 1 else PURPLE_3
        parts.extend([
            text(30, y + 18, label, 13, INK, "start", 500),
            rounded_rect(x0, y, round(width, 1), 24, fill, fill, 0, 5),
            text(min(x0 + width + 12, 955), y + 18, f"{value:,}", 12, INK, "start", 700),
        ])
    parts.append(text(600, 398, "GitHub stars · log scale keeps small projects visible", 11, MUTED, "middle", 400))
    write(
        "github-stars.svg",
        "GitHub stars by project",
        "A logarithmic horizontal bar chart shows the Universal LPC Generator at 1,400 stars, LPC Revised at 191, and four projects with single-digit stars.",
        1000, 420, "".join(parts),
    )


def horse_timing():
    rows = [("Walk (4 frames)", 150, "6.6 fps"), ("Eat (4 frames)", 150, "6.6 fps"),
            ("Gallop (4 frames)", 100, "10 fps"), ("Gallop (11 frames)", 50, "20 fps")]
    x0, plot_width = 280, 560
    parts = [text(30, 28, "FRAME DURATION", 13, MUTED, "start", 700), text(955, 28, "shorter = faster", 11, MUTED, "end")]
    for tick in [0, 50, 100, 150]:
        x = x0 + tick / 150 * plot_width
        parts.extend([
            f'<line x1="{x}" y1="50" x2="{x}" y2="270" stroke="{GRID}" stroke-width="1" />',
            text(x, 292, f"{tick} ms", 11, MUTED, "middle"),
        ])
    for index, (label, duration, fps) in enumerate(rows):
        y = 70 + index * 52
        width = duration / 150 * plot_width
        parts.extend([
            text(30, y + 19, label, 13, INK, "start", 500),
            rounded_rect(x0, y, width, 26, PURPLE if duration == 150 else PURPLE_2, PURPLE, 0, 5),
            text(x0 + width + 12, y + 19, f"{duration} ms · {fps}", 12, INK, "start", 600),
        ])
    write(
        "horse-animation-timing.svg",
        "Original horse animation timing",
        "Walk and eat use 150 millisecond frames, four-frame gallop uses 100 milliseconds, and eleven-frame gallop uses 50 milliseconds.",
        1000, 320, "".join(parts),
    )


def shadow_guide():
    parts = [text(500, 28, "ONE LIGHT DIRECTION, TWO SHADOW MODES", 13, MUTED, "middle", 700)]
    swatches = [
        (50, "#2A1722", 1, "Standard shadow", "#2a1722 · full"),
        (260, "#2A1722", 0.469, "Standard alpha", "#2a1722 · 120/256"),
        (470, "#000000", 1, "Dark scenes", "#000000"),
    ]
    for x, color, opacity, title_label, detail in swatches:
        parts.extend([
            rounded_rect(x, 70, 170, 130, SURFACE_ALT, LINE, 1, 10),
            f'<rect x="{x + 20}" y="90" width="130" height="66" rx="7" fill="{color}" '
            f'fill-opacity="{opacity}" stroke="{LINE}" stroke-width="1" />',
            text(x + 85, 178, title_label, 13, INK, "middle", 600),
            text(x + 85, 194, detail, 10, MUTED, "middle", 400),
        ])
    parts.extend([
        rounded_rect(690, 70, 260, 200, SURFACE_ALT, LINE, 1, 10),
        text(820, 94, "LIGHTING GEOMETRY", 11, MUTED, "middle", 700),
        f'<circle cx="760" cy="135" r="20" fill="#F4D35E" />',
        f'<path d="M 775 150 L 835 205" stroke="{AMBER}" stroke-width="3" fill="none" />',
        f'<polygon points="830,194 842,212 822,207" fill="{AMBER}" />',
        rounded_rect(800, 135, 70, 70, BG, INK, 2, 8),
        f'<path d="M 820 205 L 885 238 L 850 250 L 795 218 Z" fill="#2A1722" opacity="0.469" />',
        multiline(820, 278, ("Light: top-front-left", "Shadow: bottom-right"), 12, INK, "middle", 600, 17),
    ])
    write(
        "lpc-shadow-guide.svg",
        "Standard LPC shadow color and direction",
        "Three swatches show the standard shadow at full and 120/256 alpha plus black for dark scenes; a diagram shows top-front-left light casting down-right.",
        1000, 320, "".join(parts),
    )


def coverage_matrix():
    rows = [
        ("Modular characters", "Full"), ("Real-time recolor", "Full"), ("License / credits", "Full"),
        ("Animation preview", "High"), ("Reproducible build", "High"), ("Export to files", "Partial"),
        ("Sourcing breadth", "Low"), ("Style flexibility", "Low"), ("Animation authoring", "None"),
        ("Non-character assets", "None"), ("Engine-native import", "None"), ("Live link to engine", "None"),
        ("CLI / automation", "None"), ("Persistent project", "None"), ("Collaboration", "None"),
    ]
    levels = ["None", "Low", "Partial", "High", "Full"]
    x_positions = {level: 420 + index * 125 for index, level in enumerate(levels)}
    colors = {"None": RED, "Low": AMBER, "Partial": AMBER, "High": GREEN, "Full": GREEN}
    height = 670
    parts = [text(30, 28, "CAPABILITY COVERAGE", 13, MUTED, "start", 700)]
    for level in levels:
        x = x_positions[level]
        parts.extend([
            text(x, 58, level, 11, MUTED, "middle", 700),
            f'<line x1="{x}" y1="72" x2="{x}" y2="630" stroke="{GRID}" stroke-width="1" />',
        ])
    for index, (label, level) in enumerate(rows):
        y = 92 + index * 36
        if index % 2 == 0:
            parts.append(f'<rect x="20" y="{y - 18}" width="950" height="32" rx="5" fill="{SURFACE_ALT}" />')
        parts.extend([
            text(35, y + 4, label, 12, INK, "start", 500),
            f'<circle cx="{x_positions[level]}" cy="{y}" r="9" fill="{colors[level]}" />',
            f'<circle cx="{x_positions[level]}" cy="{y}" r="14" fill="none" stroke="{colors[level]}" stroke-width="2" opacity="0.25" />',
        ])
    parts.append(text(500, 654, "Qualitative categories · positions are not percentages", 11, MUTED, "middle", 400))
    write(
        "ulpc-capability-coverage.svg",
        "ULPC coverage of indie sprite needs",
        "A categorical matrix rates fifteen needs as none, low, partial, high, or full coverage without implying false numeric precision.",
        1000, height, "".join(parts),
    )


def license_ladder():
    rows = [
        ("CC0", "No attribution", "Most permissive", GREEN),
        ("OGA-BY", "Attribution", "No DRM restriction", GREEN),
        ("CC-BY", "Attribution", "Credit authors", GREEN),
        ("CC-BY-SA", "Attribution + share-alike", "Derivatives stay CC-BY-SA", AMBER),
        ("GPL", "Attribution + copyleft", "Derivatives distributed under GPL", RED),
    ]
    parts = [
        text(500, 28, "ORDERED BY PRACTICAL OBLIGATION", 13, MUTED, "middle", 700),
        f'<path d="M 70 78 V 322" stroke="{LINE}" stroke-width="4" stroke-linecap="round" />',
    ]
    for index, (license_name, obligation, detail, color) in enumerate(rows, start=1):
        y = 70 + (index - 1) * 58
        parts.extend([
            f'<circle cx="70" cy="{y + 22}" r="18" fill="{color}" />',
            text(70, y + 27, index, 11, ON_ACCENT, "middle", 700),
            rounded_rect(110, y, 840, 44, SURFACE, LINE, 1, 8),
            text(135, y + 27, license_name, 14, INK, "start", 700),
            text(270, y + 27, obligation, 13, color, "start", 600),
            text(520, y + 27, detail, 12, MUTED, "start", 400),
        ])
    parts.extend([
        text(70, 356, "more obligations", 11, MUTED, "middle", 400),
        f'<polygon points="64,330 76,330 70,342" fill="{MUTED}" />',
    ])
    write(
        "lpc-license-obligations.svg",
        "LPC license options ordered by permissiveness",
        "A five-step obligation ladder runs from CC0 with no attribution to GPL with attribution and copyleft requirements.",
        1000, 385, "".join(parts),
    )


def pain_ranking():
    rows = [
        ("Licensing & attribution", "Source / Ship"), ("Art-skill gap", "Author"),
        ("Style consistency", "Source / Author"), ("Animation labor", "Assemble"),
        ("Frame & pivot alignment", "Assemble"), ("Engine import / slicing", "Integrate"),
        ("Atlas packing / extraction", "Integrate"), ("Pixel scaling / filtering", "Integrate"),
        ("Skeletal rigging / weighting", "Assemble"), ("Runtime performance", "Ship"),
    ]
    parts = [
        text(30, 30, "QUALITATIVE PAIN RANKING", 13, MUTED, "start", 700),
        text(970, 30, "synthesized from recurring public discussions", 11, MUTED, "end", 400),
    ]
    for index, (label, stage) in enumerate(rows, start=1):
        y = 60 + (index - 1) * 48
        color = RED if index <= 2 else AMBER if index <= 8 else GREEN
        if index % 2 == 1:
            parts.append(f'<rect x="20" y="{y - 10}" width="950" height="40" rx="6" fill="{SURFACE_ALT}" />')
        parts.extend([
            f'<circle cx="55" cy="{y + 10}" r="15" fill="{color}" />',
            text(55, y + 15, index, 11, ON_ACCENT, "middle", 700),
            text(90, y + 15, label, 13, INK, "start", 600),
            pill(720, y - 4, 210, stage, BG, color, color),
        ])
    parts.append(text(500, 555, "Rank communicates order only; this is not survey-derived magnitude.", 11, MUTED, "middle"))
    write(
        "sprite-pipeline-pain-ranking.svg",
        "Relative pain of common sprite-pipeline problems",
        "A qualitative ranking places licensing and attribution first, followed by the art-skill gap and eight other recurring pipeline problems.",
        1000, 580, "".join(parts),
    )


def live_link():
    top_steps = ["Edit", "Export", "Import", "Slice", "Replay"]
    parts = [
        text(30, 28, "MANUAL ROUND-TRIP", 12, MUTED, "start", 700),
        text(970, 28, "five handoffs per change", 11, RED, "end", 600),
    ]
    centers = [100 + index * 190 for index in range(5)]
    for index in range(4):
        parts.append(arrow_right(centers[index] + 60, 92, centers[index + 1] - 60, RED, 2))
    for cx, label in zip(centers, top_steps):
        parts.append(node(cx - 60, 62, 120, 60, (label,), small=True))
    parts.extend([
        f'<line x1="30" y1="157" x2="970" y2="157" stroke="{LINE}" stroke-width="1" />',
        text(30, 190, "WITH A LIVE LINK", 12, MUTED, "start", 700),
        text(970, 190, "one edit, automatic propagation", 11, GREEN, "end", 600),
        node(100, 220, 180, 70, ("Edit asset", "once"), active=True),
        arrow_right(280, 255, 390, GREEN, 3),
        node(390, 210, 500, 90, ("Appears in the running engine", "native files update · engine reimports"), accent=True),
    ])
    write(
        "manual-vs-live-link.svg",
        "Manual round-trip versus live asset linking",
        "The manual workflow requires edit, export, import, slice, and replay; a live link reduces it to one edit that propagates into the running engine.",
        1000, 340, "".join(parts),
    )


def generate_all():
    product_architecture()
    composition_flow()
    token_resolution()
    expansion_rings()
    mvp_journey()
    north_star()
    delivery_roadmap()
    stars_chart()
    horse_timing()
    shadow_guide()
    coverage_matrix()
    license_ladder()
    pain_ranking()
    live_link()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--theme", type=Path, default=DEFAULT_THEME, help="SVG theme JSON")
    parser.add_argument("--modes", nargs="+", default=["light", "dark"], help="theme modes to generate")
    args = parser.parse_args()
    theme = json.loads(args.theme.read_text(encoding="utf-8"))
    unknown = [mode for mode in args.modes if mode not in theme["modes"]]
    if unknown:
        parser.error(f"theme does not define mode(s): {', '.join(unknown)}")
    for mode in args.modes:
        apply_theme(theme, mode)
        generate_all()
    print(f"Generated {14 * len(args.modes)} SVG variants from theme '{theme['name']}' in {OUT}")


if __name__ == "__main__":
    main()