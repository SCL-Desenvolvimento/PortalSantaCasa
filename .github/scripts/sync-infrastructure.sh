#!/usr/bin/env bash
# Copy only versioned infrastructure into the existing production build context.
set -euo pipefail

fail() {
    printf 'Erro na sincronização da infraestrutura: %s\n' "$*" >&2
    exit 1
}

[[ $# -eq 2 ]] || fail 'Informe o diretório do repositório e o diretório de produção.'
[[ -d "$1" ]] || fail "Origem não encontrada: $1"
[[ -d "$2" ]] || fail "Diretório de produção não encontrado: $2"
source_dir=$(cd -- "$1" && pwd -P)
deploy_dir=$(cd -- "$2" && pwd -P)
[[ "$source_dir" != "$deploy_dir" ]] || fail 'Origem e produção devem ser diretórios diferentes.'
[[ "$deploy_dir" != / ]] || fail 'O diretório raiz não pode ser usado como produção.'
[[ "$deploy_dir/" != "$source_dir/"* && "$source_dir/" != "$deploy_dir/"* ]] \
    || fail 'Origem e produção não podem estar contidas uma na outra.'

required=(Dockerfile Dockerfile.realtime docker-compose.yml entrypoint.sh
          gateway/site.json)
for relative in "${required[@]}"; do
    [[ -f "$source_dir/$relative" && -r "$source_dir/$relative" && ! -L "$source_dir/$relative" ]] \
        || fail "Arquivo obrigatório ausente, sem leitura ou simbólico: $relative"
done
bash -n "$source_dir/entrypoint.sh"

# Expand managed folders without traversing links to files outside the checkout.
shopt -s globstar nullglob dotglob
managed_files=(Dockerfile Dockerfile.realtime docker-compose.yml entrypoint.sh)
for folder in gateway; do
    [[ ! -L "$source_dir/$folder" ]] || fail "Pasta de origem simbólica: $folder"
    for source_file in "$source_dir/$folder"/**/*; do
        [[ ! -L "$source_file" ]] || fail "Link simbólico na origem: $source_file"
        [[ ! -d "$source_file" ]] || continue
        [[ -f "$source_file" && -r "$source_file" ]] || fail "Arquivo sem leitura: $source_file"
        managed_files+=("${source_file#"$source_dir/"}")
    done
done

# Complete preflight before replacing any production file. Permissions are
# prepared once by the administrator, never escalated by the workflow.
[[ -w "$deploy_dir" && -x "$deploy_dir" ]] \
    || fail "Sem escrita em $deploy_dir para $(id -un). Consulte .github/scripts/README.md."
for relative in "${managed_files[@]}"; do
    destination="$deploy_dir/$relative"
    if [[ -e "$destination" || -L "$destination" ]]; then
        [[ -f "$destination" && ! -L "$destination" && -w "$destination" ]] \
            || fail "Destino não gravável, não regular ou simbólico: $destination. Consulte .github/scripts/README.md."
    fi
    parent=$(dirname -- "$destination")
    while [[ "$parent" != "$deploy_dir" ]]; do
        [[ ! -L "$parent" ]] || fail "Pasta de destino simbólica: $parent"
        if [[ -e "$parent" ]]; then
            [[ -d "$parent" && -w "$parent" && -x "$parent" ]] \
                || fail "Pasta de destino sem escrita ou inválida: $parent. Consulte .github/scripts/README.md."
        fi
        parent=$(dirname -- "$parent")
    done
done

for relative in "${managed_files[@]}"; do
    destination="$deploy_dir/$relative"
    mkdir -p -- "$(dirname -- "$destination")"
    case "$relative" in
        *.sh) mode=0755 ;;
        *) mode=0644 ;;
    esac
    install -m "$mode" -- "$source_dir/$relative" "$destination"
done

printf 'Infraestrutura sincronizada: %s\n' "$deploy_dir"
