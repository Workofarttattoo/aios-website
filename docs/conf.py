# Sphinx configuration for Ai|oS Documentation
# This file configures automatic documentation generation from Python docstrings

import os
import sys
from pathlib import Path

# Add parent directories to path for autodoc
sys.path.insert(0, os.path.abspath('../..'))
sys.path.insert(0, os.path.abspath('../../aios'))

# Project information
project = 'Ai|oS'
copyright = '2025, Joshua Hendricks Cole (DBA: Corporation of Light)'
author = 'Joshua Hendricks Cole'
release = '2.0.0'
version = '2.0.0'

# Sphinx extensions
extensions = [
    'sphinx.ext.autodoc',
    'sphinx.ext.autosummary',
    'sphinx.ext.intersphinx',
    'sphinx.ext.doctest',
    'sphinx.ext.coverage',
    'sphinx.ext.mathjax',
    'sphinx_rtd_theme',
    'sphinx.ext.napoleon',
    'myst_parser',
]

# Source file suffixes
source_suffix = {
    '.rst': 'restructuredtext',
    '.md': 'markdown',
}

# Master document
master_doc = 'index'

# Theme configuration
html_theme = 'sphinx_rtd_theme'
html_theme_options = {
    'logo_only': False,
    'display_version': True,
    'prev_next_buttons_location': 'bottom',
    'style_external_links': False,
    'vcs_pageview_mode': '',
    'style_nav_header_background': '#050505',
    'collapse_navigation': True,
    'sticky_navigation': True,
    'navigation_depth': 4,
    'includehidden': True,
    'titles_only': False,
}

# HTML output options
html_static_path = ['_static']
html_css_files = ['custom.css']

# Add custom CSS for quantum aesthetic
html_context = {
    'display_github': True,
    'github_user': 'Workofarttattoo',
    'github_repo': 'AioS',
    'github_version': 'main',
    'conf_py_path': '/docs/',
}

# Autodoc settings
autodoc_default_options = {
    'members': True,
    'member-order': 'bysource',
    'special-members': '__init__',
    'undoc-members': True,
    'show-inheritance': True,
    'inherited-members': True,
}

# Napoleon settings (for Google-style docstrings)
napoleon_google_docstring = True
napoleon_numpy_docstring = True
napoleon_include_private_with_doc = False
napoleon_include_special_with_doc = True

# Intersphinx mapping
intersphinx_mapping = {
    'python': ('https://docs.python.org/3', None),
    'numpy': ('https://numpy.org/doc/stable/', None),
    'scipy': ('https://docs.scipy.org/doc/scipy/', None),
    'pytorch': ('https://pytorch.org/docs/stable/', None),
}

# Exclude patterns
exclude_patterns = ['_build', 'Thumbs.db', '.DS_Store']

# Language
language = 'en'

# Highlight language
highlight_language = 'python'
pygments_style = 'monokai'

# LaTeX configuration for PDF generation
latex_elements = {
    'papersize': 'letterpaper',
    'pointsize': '10pt',
    'preamble': r'\usepackage{xcolor}',
}

# Doctest settings
doctest_default_flags = (
    doctest.ELLIPSIS | doctest.IGNORE_EXCEPTION_DETAIL | doctest.NORMALIZE_WHITESPACE
)

# Breathe/Doxygen settings (for C++ autodoc if needed)
breathe_projects = {}
breathe_default_project = ''

# Custom roles and substitutions
rst_prolog = """
.. |project| replace:: Ai|oS
.. |copyright| replace:: © 2025 Joshua Hendricks Cole (DBA: Corporation of Light)
"""
