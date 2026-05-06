#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HOME_AGENTS_DIR="${HOME}/.agents/skills"
HOME_CURSOR_SKILLS_DIR="${HOME}/.cursor/skills-cursor"

echo "Installing bundled skills from ${REPO_ROOT}/.agents/ ..."

mkdir -p "${HOME_AGENTS_DIR}" "${HOME_CURSOR_SKILLS_DIR}"

link_dir() {
  local source_dir="$1"
  local target_dir="$2"

  if [ ! -d "${source_dir}" ]; then return 0; fi

  for skill_path in "${source_dir}"/*; do
    [ -d "${skill_path}" ] || continue
    local skill_name
    skill_name="$(basename "${skill_path}")"
    local target="${target_dir}/${skill_name}"

    if [ -L "${target}" ]; then
      rm "${target}"
    elif [ -d "${target}" ]; then
      echo "  skip ${skill_name} (existing non-symlink target at ${target})"
      continue
    fi

    ln -s "${skill_path}" "${target}"
    echo "  linked ${skill_name} -> ${target}"
  done
}

link_dir "${REPO_ROOT}/.agents/skills" "${HOME_AGENTS_DIR}"
link_dir "${REPO_ROOT}/.agents/skills-cursor" "${HOME_CURSOR_SKILLS_DIR}"

echo
echo "Done. Run 'bun skills:install' again any time you add new skills."
