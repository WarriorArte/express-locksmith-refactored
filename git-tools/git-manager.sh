#!/bin/bash
# =========================================
# Git Manager Pro - Control de ramas y commits
# =========================================
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Función para mostrar encabezado
show_header() {
    clear
    echo -e "${BLUE}"
    echo "=========================================="
    echo "        GIT MANAGER PRO"
    echo "=========================================="
    echo -e "${NC}"
}

# Función para verificar si es un repo git
check_git_repo() {
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        echo -e "${RED}❌ Este directorio no es un repositorio Git${NC}"
        exit 1
    fi
}

# Función para obtener el remote
get_remote() {
    git config --get remote.origin.url 2>/dev/null
}

# Función para contar commits en una rama
count_commits() {
    local branch=$1
    git rev-list --count $branch 2>/dev/null || echo "0"
}

# Menú principal
main_menu() {
    show_header
    
    CURRENT_BRANCH=$(git branch --show-current)
    REMOTE=$(get_remote)
    
    if [ -z "$REMOTE" ]; then
        echo -e "${RED}⚠️ Sin remote (GitHub) configurado${NC}"
    else
        echo -e "${GREEN}✓ Remote:${NC} $REMOTE"
    fi
    echo ""
    echo -e "${GREEN}📌 Rama actual:${NC} $CURRENT_BRANCH"
    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo "1)  📊 Ver todas las ramas (local + GitHub)"
    echo "2)  🔢 Contar commits por rama"
    echo "3)  ✨ Crear nueva rama"
    echo "4)  ✏️  Renombrar rama"
    echo "5)  🗑️  Eliminar rama (local o remota)"
    echo "6)  🧹 Limpiar commits de una rama"
    echo "7)  ⚡ Mantener solo últimos N commits"
    echo "8)  ☝️  Mantener solo último commit"
    echo "9)  🎯 Eliminar commits específicos"
    echo "10) 🔄 Sincronizar con GitHub"
    echo "11) 📜 Ver historial de commits"
    echo "12) 🗑️  Limpiar referencias antiguas (reflog)"
    echo "13) 🚪 Salir"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    read -p "👉 Selecciona opción: " OPTION
}

# Opción 1: Ver todas las ramas
view_all_branches() {
    show_header
    echo -e "${BLUE}📊 RAMAS LOCALES:${NC}"
    echo ""
    git branch -v
    echo ""
    echo -e "${BLUE}📡 RAMAS EN GITHUB (Remote):${NC}"
    echo ""
    if git ls-remote --heads origin &>/dev/null; then
        git branch -r
    else
        echo -e "${RED}❌ No hay conexión con GitHub${NC}"
    fi
    echo ""
    read -p "Presiona Enter para continuar..."
}

# Opción 2: Contar commits por rama
count_commits_all() {
    show_header
    echo -e "${BLUE}🔢 COMMITS POR RAMA:${NC}"
    echo ""
    
    echo -e "${BLUE}🔄 Actualizando referencias de GitHub...${NC}"
    git fetch origin 2>&1 > /dev/null
    echo -e "${GREEN}✅ Referencias actualizadas${NC}"
    echo ""
    
    # Local branches
    echo -e "${CYAN}Local:${NC}"
    while IFS= read -r branch; do
        branch=${branch#\*}
        branch=$(echo $branch | xargs)
        count=$(git rev-list --count "refs/heads/$branch" 2>/dev/null)
        printf "  %-40s %s commits\n" "$branch" "$count"
    done < <(git branch)
    
    echo ""
    echo -e "${CYAN}Remote (GitHub):${NC}"
    while IFS= read -r branch; do
        # Contar commits en la rama remota
        branch_name=$(echo "$branch" | sed 's|origin/||')
        count=$(git rev-list --count "$branch" 2>/dev/null)
        printf "  %-40s %s commits\n" "$branch_name" "$count"
    done < <(git branch -r | grep -v "HEAD")
    
    echo ""
    echo -e "${YELLOW}Total de commits en todo el repo:${NC}"
    git --no-pager log --all --oneline | wc -l
    
    echo ""
    echo -e "${CYAN}═══════════════════════════════════════${NC}"
    echo -e "${YELLOW}IMPORTANTE:${NC}"
    echo "Si ves diferencia entre Local y Remote:"
    echo "1. Verifica estar en la rama correcta (git branch)"
    echo "2. El cambio puede tardar unos segundos en GitHub"
    echo "3. Intenta recargar: opción 2 nuevamente"
    echo -e "${CYAN}═══════════════════════════════════════${NC}"
    echo ""
    read -p "Presiona Enter para continuar..."
}

# Opción 3: Crear nueva rama
create_branch() {
    show_header
    echo -e "${BLUE}✨ CREAR NUEVA RAMA${NC}"
    echo ""
    read -p "Nombre de la nueva rama: " BRANCH_NAME
    
    if [ -z "$BRANCH_NAME" ]; then
        echo -e "${RED}❌ Nombre inválido${NC}"
        sleep 2
        return
    fi
    
    if git show-ref --quiet refs/heads/$BRANCH_NAME; then
        echo -e "${RED}❌ La rama ya existe${NC}"
        sleep 2
        return
    fi
    
    git branch $BRANCH_NAME
    echo -e "${GREEN}✅ Rama '$BRANCH_NAME' creada${NC}"
    
    read -p "¿Cambiar a esta rama? (s/n): " SWITCH
    if [[ "$SWITCH" == "s" ]]; then
        git checkout $BRANCH_NAME
        echo -e "${GREEN}✅ Cambiado a rama '$BRANCH_NAME'${NC}"
    fi
    
    read -p "¿Subir a GitHub? (s/n): " PUSH
    if [[ "$PUSH" == "s" ]]; then
        git push -u origin $BRANCH_NAME
        echo -e "${GREEN}✅ Rama subida a GitHub${NC}"
    fi
    
    sleep 2
}

# Opción 4: Renombrar rama
rename_branch() {
    show_header
    echo -e "${BLUE}✏️  RENOMBRAR RAMA${NC}"
    echo ""
    
    echo -e "${CYAN}Ramas disponibles:${NC}"
    git branch
    echo ""
    
    read -p "Rama actual a renombrar: " OLD_NAME
    read -p "Nuevo nombre: " NEW_NAME
    
    if [ -z "$OLD_NAME" ] || [ -z "$NEW_NAME" ]; then
        echo -e "${RED}❌ Nombres inválidos${NC}"
        sleep 2
        return
    fi
    
    # Si la rama actual es la que se va a renombrar
    CURRENT=$(git branch --show-current)
    if [[ "$CURRENT" == "$OLD_NAME" ]]; then
        git branch -m $NEW_NAME
        echo -e "${GREEN}✅ Rama actual renombrada: $OLD_NAME → $NEW_NAME${NC}"
    else
        git branch -m $OLD_NAME $NEW_NAME
        echo -e "${GREEN}✅ Rama renombrada: $OLD_NAME → $NEW_NAME${NC}"
    fi
    
    # Actualizar en GitHub si existe
    read -p "¿Actualizar en GitHub? (s/n): " UPDATE_GH
    if [[ "$UPDATE_GH" == "s" ]]; then
        git push origin -u $NEW_NAME
        git push origin --delete $OLD_NAME 2>/dev/null
        echo -e "${GREEN}✅ Cambio actualizado en GitHub${NC}"
    fi
    
    sleep 2
}

# Opción 5: Eliminar rama
delete_branch() {
    show_header
    echo -e "${BLUE}🗑️  ELIMINAR RAMA${NC}"
    echo ""
    
    echo -e "${CYAN}Ramas disponibles:${NC}"
    git branch
    echo ""
    
    read -p "Nombre de la rama a eliminar: " BRANCH_DEL
    
    if [ -z "$BRANCH_DEL" ]; then
        echo -e "${RED}❌ Nombre inválido${NC}"
        sleep 2
        return
    fi
    
    if [ "$BRANCH_DEL" == "$(git branch --show-current)" ]; then
        echo -e "${RED}❌ No puedes eliminar la rama actual${NC}"
        sleep 2
        return
    fi
    
    echo ""
    echo -e "${YELLOW}⚠️  ¿Eliminar dónde?${NC}"
    echo "1) Solo local"
    echo "2) Solo en GitHub"
    echo "3) En ambos (local + GitHub)"
    echo ""
    read -p "Opción: " DEL_OPT
    
    case $DEL_OPT in
        1)
            git branch -d $BRANCH_DEL 2>/dev/null || git branch -D $BRANCH_DEL
            echo -e "${GREEN}✅ Rama local eliminada${NC}"
            ;;
        2)
            git push origin --delete $BRANCH_DEL
            echo -e "${GREEN}✅ Rama en GitHub eliminada${NC}"
            ;;
        3)
            git branch -d $BRANCH_DEL 2>/dev/null || git branch -D $BRANCH_DEL
            git push origin --delete $BRANCH_DEL
            echo -e "${GREEN}✅ Rama eliminada (local + GitHub)${NC}"
            ;;
        *)
            echo -e "${RED}❌ Opción inválida${NC}"
            ;;
    esac
    
    sleep 2
}

# Opción 6: Limpiar commits
clean_commits() {
    show_header
    echo -e "${BLUE}🧹 LIMPIAR COMMITS${NC}"
    echo ""
    
    CURRENT_BRANCH=$(git branch --show-current)
    echo -e "${GREEN}📌 Rama actual:${NC} $CURRENT_BRANCH"
    echo -e "${CYAN}Commits en GitHub ahora:${NC} $(git rev-list --count origin/$CURRENT_BRANCH 2>/dev/null || echo 'N/A')"
    echo ""
    
    echo -e "${YELLOW}⚠️  Esto reescribirá el historial${NC}"
    read -p "¿Deseas continuar? (s/n): " CONFIRM
    
    if [[ "$CONFIRM" != "s" ]]; then
        echo "Cancelado."
        sleep 2
        return
    fi
    
    echo ""
    echo -e "${BLUE}📦 Guardando referencia segura (reflog)...${NC}"
    BACKUP_REF=$(git rev-parse HEAD)
    echo -e "${GREEN}✅ Referencia guardada: $BACKUP_REF${NC}"
    echo -e "${YELLOW}💡 Si algo sale mal, ejecuta: git reset --hard $BACKUP_REF${NC}"
    
    echo ""
    echo -e "${BLUE}📜 Últimos commits:${NC}"
    git log --oneline -20
    
    echo ""
    BASE=$(git merge-base main HEAD 2>/dev/null)
    if [ -z "$BASE" ]; then
        BASE=$(git rev-list --max-parents=0 HEAD)
    fi
    
    echo -e "${YELLOW}Commit base (más antiguo):${NC} $BASE"
    
    read -p "¿Eliminar TODO el historial antes de ese commit? (s/n): " CLEAN
    if [[ "$CLEAN" == "s" ]]; then
        git reset --hard $BASE
        echo ""
        echo -e "${BLUE}📊 Commits locales después de limpiar:${NC}"
        LOCAL_COUNT=$(git rev-list --count HEAD)
        git log --oneline -5
        echo -e "${CYAN}Total local: $LOCAL_COUNT commits${NC}"
        
        echo ""
        echo -e "${GREEN}✅ Commits antiguos eliminados (LOCAL)${NC}"
        
        read -p "¿Subir cambios a GitHub en rama '$CURRENT_BRANCH'? (s/n): " PUSH
        if [[ "$PUSH" == "s" ]]; then
            echo ""
            echo -e "${BLUE}📤 Subiendo a GitHub (fuerza) rama: $CURRENT_BRANCH...${NC}"
            
            if git push -f origin $CURRENT_BRANCH 2>&1; then
                echo -e "${GREEN}✅ Push enviado${NC}"
                
                echo ""
                echo -e "${BLUE}🔄 Actualizando referencias de GitHub...${NC}"
                git fetch origin $CURRENT_BRANCH 2>&1
                
                echo ""
                echo -e "${BLUE}📊 Verificando resultado en GitHub:${NC}"
                REMOTE_COUNT=$(git rev-list --count origin/$CURRENT_BRANCH 2>/dev/null || echo "0")
                echo -e "${CYAN}Commits en origin/$CURRENT_BRANCH: $REMOTE_COUNT${NC}"
                git log --oneline origin/$CURRENT_BRANCH -n 5
                
                if [ "$LOCAL_COUNT" == "$REMOTE_COUNT" ]; then
                    echo ""
                    echo -e "${GREEN}✅✅ ÉXITO: Local y GitHub sincronizados ($LOCAL_COUNT commits)${NC}"
                else
                    echo ""
                    echo -e "${YELLOW}⚠️  Local: $LOCAL_COUNT | GitHub: $REMOTE_COUNT (puede tardar en actualizar)${NC}"
                fi
            else
                echo ""
                echo -e "${RED}❌ Error al subir a GitHub${NC}"
                echo -e "${YELLOW}💡 Verifica:${NC}"
                echo "   1. ¿Tienes conexión a internet?"
                echo "   2. ¿Estás autenticado en GitHub?"
                echo "   3. ¿Tienes permiso en el repositorio?"
                echo ""
                echo -e "${YELLOW}Para intentar manualmente:${NC}"
                echo "   git push -f origin $CURRENT_BRANCH"
            fi
        fi
    fi
    
    sleep 3
}

# Opción 7: Mantener solo últimos N commits
keep_last_n() {
    show_header
    echo -e "${BLUE}⚡ MANTENER SOLO ÚLTIMOS N COMMITS${NC}"
    echo ""
    
    CURRENT_BRANCH=$(git branch --show-current)
    echo -e "${GREEN}📌 Rama actual:${NC} $CURRENT_BRANCH"
    echo -e "${CYAN}Commits en GitHub ahora:${NC} $(git rev-list --count origin/$CURRENT_BRANCH 2>/dev/null || echo 'N/A')"
    echo ""
    
    read -p "¿Cuántos commits quieres conservar?: " NUM
    
    if ! [[ "$NUM" =~ ^[0-9]+$ ]]; then
        echo -e "${RED}❌ Número inválido${NC}"
        sleep 2
        return
    fi
    
    echo ""
    echo -e "${BLUE}📜 Últimos $NUM commits:${NC}"
    git log --oneline -n $NUM
    
    echo ""
    echo -e "${YELLOW}⚠️  Esto eliminará todo lo anterior${NC}"
    read -p "¿Continuar? (s/n): " CONFIRM
    
    if [[ "$CONFIRM" != "s" ]]; then
        echo "Cancelado."
        sleep 2
        return
    fi
    
    echo ""
    echo -e "${BLUE}📦 Guardando referencia segura (reflog)...${NC}"
    BACKUP_REF=$(git rev-parse HEAD)
    echo -e "${GREEN}✅ Referencia guardada: $BACKUP_REF${NC}"
    echo -e "${YELLOW}💡 Si algo sale mal, ejecuta: git reset --hard $BACKUP_REF${NC}"

    TOTAL=$(git rev-list --count HEAD)
    if [ "$NUM" -ge "$TOTAL" ]; then
        echo -e "${YELLOW}⚠️  Ya tienes solo $TOTAL commits, nada que eliminar.${NC}"
        sleep 2
        return
    fi

    # Commit más antiguo a conservar (el N-ésimo desde HEAD)
    OLDEST=$(git rev-list HEAD | sed -n "${NUM}p")
    echo -e "${YELLOW}Commit más antiguo a conservar:${NC} $OLDEST"
    echo ""

    # Crear nuevo commit raíz huérfano con el mismo árbol que OLDEST
    echo -e "${BLUE}🔨 Creando nuevo commit raíz sin historial anterior...${NC}"
    TREE=$(git rev-parse "${OLDEST}^{tree}")
    MSG=$(git log -1 --format=%B "$OLDEST")
    NEW_ROOT=$(git commit-tree "$TREE" -m "$MSG")

    # Rebasear los commits más recientes encima del nuevo raíz
    echo -e "${BLUE}🔄 Rebaseando commits recientes...${NC}"
    git rebase --onto "$NEW_ROOT" "$OLDEST" HEAD

    echo ""
    echo -e "${BLUE}📊 Commits locales después de limpiar:${NC}"
    LOCAL_COUNT=$(git rev-list --count HEAD)
    git log --oneline -n "$NUM"
    echo -e "${CYAN}Total local: $LOCAL_COUNT commits${NC}"

    echo ""
    echo -e "${GREEN}✅ Historial reducido a $LOCAL_COUNT commits (LOCAL)${NC}"
    
    read -p "¿Subir cambios a GitHub en rama '$CURRENT_BRANCH'? (s/n): " PUSH
    if [[ "$PUSH" == "s" ]]; then
        echo ""
        echo -e "${BLUE}📤 Subiendo a GitHub (fuerza) rama: $CURRENT_BRANCH...${NC}"
        
        if git push -f origin $CURRENT_BRANCH 2>&1; then
            echo -e "${GREEN}✅ Push enviado${NC}"
            
            echo ""
            echo -e "${BLUE}🔄 Actualizando referencias de GitHub...${NC}"
            git fetch origin $CURRENT_BRANCH 2>&1
            
            echo ""
            echo -e "${BLUE}📊 Verificando resultado en GitHub:${NC}"
            REMOTE_COUNT=$(git rev-list --count origin/$CURRENT_BRANCH 2>/dev/null || echo "0")
            echo -e "${CYAN}Commits en origin/$CURRENT_BRANCH: $REMOTE_COUNT${NC}"
            git log --oneline origin/$CURRENT_BRANCH -n 5
            
            if [ "$LOCAL_COUNT" == "$REMOTE_COUNT" ]; then
                echo ""
                echo -e "${GREEN}✅✅ ÉXITO: Local y GitHub sincronizados ($LOCAL_COUNT commits)${NC}"
            else
                echo ""
                echo -e "${YELLOW}⚠️  Local: $LOCAL_COUNT | GitHub: $REMOTE_COUNT (puede tardar en actualizar)${NC}"
            fi
        else
            echo ""
            echo -e "${RED}❌ Error al subir a GitHub${NC}"
            echo -e "${YELLOW}💡 Verifica:${NC}"
            echo "   1. ¿Tienes conexión a internet?"
            echo "   2. ¿Estás autenticado en GitHub?"
            echo "   3. ¿Tienes permiso en el repositorio?"
            echo ""
            echo -e "${YELLOW}Para intentar manualmente:${NC}"
            echo "   git push -f origin $CURRENT_BRANCH"
        fi
    fi
    
    sleep 3
}

# Opción 8: Mantener solo último commit
keep_last_one() {
    show_header
    echo -e "${BLUE}☝️  MANTENER SOLO ÚLTIMO COMMIT${NC}"
    echo ""
    
    CURRENT_BRANCH=$(git branch --show-current)
    echo -e "${GREEN}📌 Rama actual:${NC} $CURRENT_BRANCH"
    echo -e "${CYAN}Commits en GitHub ahora:${NC} $(git rev-list --count origin/$CURRENT_BRANCH 2>/dev/null || echo 'N/A')"
    echo ""
    
    echo -e "${BLUE}📜 Último commit:${NC}"
    git log --oneline -1
    
    echo ""
    echo -e "${YELLOW}⚠️  Esto eliminará TODOS los commits anteriores${NC}"
    read -p "¿Confirmar? (s/n): " CONFIRM
    
    if [[ "$CONFIRM" != "s" ]]; then
        echo "Cancelado."
        sleep 2
        return
    fi
    
    echo ""
    echo -e "${BLUE}📦 Guardando referencia segura (reflog)...${NC}"
    BACKUP_REF=$(git rev-parse HEAD)
    echo -e "${GREEN}✅ Referencia guardada: $BACKUP_REF${NC}"
    echo -e "${YELLOW}💡 Si algo sale mal, ejecuta: git reset --hard $BACKUP_REF${NC}"

    TOTAL=$(git rev-list --count HEAD)
    if [ "$TOTAL" -le 1 ]; then
        echo -e "${YELLOW}⚠️  Ya tienes solo 1 commit, nada que eliminar.${NC}"
        sleep 2
        return
    fi

    # Crear nuevo commit raíz huérfano con el mismo árbol que HEAD (sin padre)
    echo -e "${BLUE}🔨 Creando commit raíz único sin historial anterior...${NC}"
    TREE=$(git rev-parse "HEAD^{tree}")
    MSG=$(git log -1 --format=%B HEAD)
    NEW_COMMIT=$(git commit-tree "$TREE" -m "$MSG")
    git reset --hard "$NEW_COMMIT"

    echo ""
    echo -e "${BLUE}📊 Commits locales después de limpiar:${NC}"
    LOCAL_COUNT=$(git rev-list --count HEAD)
    git log --oneline
    echo -e "${CYAN}Total local: $LOCAL_COUNT commit${NC}"

    echo ""
    echo -e "${GREEN}✅ Solo se mantiene el último commit (LOCAL)${NC}"
    
    read -p "¿Subir cambios a GitHub en rama '$CURRENT_BRANCH'? (s/n): " PUSH
    if [[ "$PUSH" == "s" ]]; then
        echo ""
        echo -e "${BLUE}📤 Subiendo a GitHub (fuerza) rama: $CURRENT_BRANCH...${NC}"
        
        if git push -f origin $CURRENT_BRANCH 2>&1; then
            echo -e "${GREEN}✅ Push enviado${NC}"
            
            echo ""
            echo -e "${BLUE}🔄 Actualizando referencias de GitHub...${NC}"
            git fetch origin $CURRENT_BRANCH 2>&1
            
            echo ""
            echo -e "${BLUE}📊 Verificando resultado en GitHub:${NC}"
            REMOTE_COUNT=$(git rev-list --count origin/$CURRENT_BRANCH 2>/dev/null || echo "0")
            echo -e "${CYAN}Commits en origin/$CURRENT_BRANCH: $REMOTE_COUNT${NC}"
            git log --oneline origin/$CURRENT_BRANCH
            
            if [ "$LOCAL_COUNT" == "$REMOTE_COUNT" ]; then
                echo ""
                echo -e "${GREEN}✅✅ ÉXITO: Local y GitHub sincronizados ($LOCAL_COUNT commit)${NC}"
            else
                echo ""
                echo -e "${YELLOW}⚠️  Local: $LOCAL_COUNT | GitHub: $REMOTE_COUNT (puede tardar en actualizar)${NC}"
            fi
        else
            echo ""
            echo -e "${RED}❌ Error al subir a GitHub${NC}"
            echo -e "${YELLOW}💡 Verifica:${NC}"
            echo "   1. ¿Tienes conexión a internet?"
            echo "   2. ¿Estás autenticado en GitHub?"
            echo "   3. ¿Tienes permiso en el repositorio?"
            echo ""
            echo -e "${YELLOW}Para intentar manualmente:${NC}"
            echo "   git push -f origin $CURRENT_BRANCH"
        fi
    fi
    
    sleep 3
}

# Opción 9: Eliminar commits específicos
delete_specific_commits() {
    show_header
    echo -e "${BLUE}🎯 ELIMINAR COMMITS ESPECÍFICOS${NC}"
    echo ""
    
    CURRENT_BRANCH=$(git branch --show-current)
    echo -e "${GREEN}Rama actual:${NC} $CURRENT_BRANCH"
    echo ""
    
    echo -e "${BLUE}📜 Commits disponibles:${NC}"
    git log --oneline -20
    
    echo ""
    echo -e "${YELLOW}⚠️  Esto reescribirá el historial${NC}"
    echo "Introduce los hashes de los commits a ELIMINAR (separados por espacio)"
    echo "Ejemplo: abc123 def456 ghi789"
    echo ""
    
    read -p "Commits a eliminar: " COMMITS_TO_DELETE
    
    if [ -z "$COMMITS_TO_DELETE" ]; then
        echo -e "${RED}❌ Sin commits especificados${NC}"
        sleep 2
        return
    fi
    
    echo ""
    echo -e "${BLUE}📦 Guardando referencia segura (reflog)...${NC}"
    BACKUP_REF=$(git rev-parse HEAD)
    echo -e "${GREEN}✅ Referencia guardada: $BACKUP_REF${NC}"
    echo -e "${YELLOW}💡 Si algo sale mal, ejecuta: git reset --hard $BACKUP_REF${NC}"
    
    echo ""
    echo -e "${YELLOW}Iniciando interactive rebase...${NC}"
    echo -e "${YELLOW}Marca los commits a ELIMINAR con 'd' o 'drop'${NC}"
    echo ""

    TOTAL=$(git rev-list --count HEAD)
    REBASE_N=$(( TOTAL < 20 ? TOTAL : 20 ))
    git rebase -i HEAD~$REBASE_N
    
    echo -e "${GREEN}✅ Commits eliminados${NC}"
    
    read -p "¿Subir cambios a GitHub? (s/n): " PUSH
    if [[ "$PUSH" == "s" ]]; then
        git push -f origin $CURRENT_BRANCH
        echo -e "${GREEN}✅ Cambios subidos a GitHub (fuerza)${NC}"
    fi
    
    sleep 2
}

# Opción 10: Sincronizar con GitHub
sync_github() {
    show_header
    echo -e "${BLUE}🔄 SINCRONIZAR CON GITHUB${NC}"
    echo ""
    
    CURRENT_BRANCH=$(git branch --show-current)
    echo -e "${GREEN}Rama actual:${NC} $CURRENT_BRANCH"
    echo ""
    
    # Verificar remote
    REMOTE=$(get_remote)
    if [ -z "$REMOTE" ]; then
        echo -e "${RED}❌ No hay remote configurado${NC}"
        sleep 2
        return
    fi
    
    echo -e "${CYAN}Opciones:${NC}"
    echo "1) Pull (traer cambios de GitHub)"
    echo "2) Push (subir cambios a GitHub)"
    echo "3) Push fuerza (overwrite remoto)"
    echo "4) Fetch (actualizar referencias remotas)"
    echo "5) Pull desde rama específica"
    echo ""
    read -p "Opción: " SYNC_OPT
    
    case $SYNC_OPT in
        1)
            echo -e "${BLUE}📥 Bajando cambios...${NC}"
            git pull origin $CURRENT_BRANCH
            echo -e "${GREEN}✅ Actualizado desde GitHub${NC}"
            ;;
        2)
            echo -e "${BLUE}📤 Subiendo cambios...${NC}"
            git push origin $CURRENT_BRANCH
            echo -e "${GREEN}✅ Cambios subidos a GitHub${NC}"
            ;;
        3)
            echo -e "${YELLOW}⚠️  Esto sobrescribirá la rama remota${NC}"
            read -p "¿Confirmar? (s/n): " FORCE_CONFIRM
            if [[ "$FORCE_CONFIRM" == "s" ]]; then
                git push -f origin $CURRENT_BRANCH
                echo -e "${GREEN}✅ Fuerza aplicada - rama remota actualizada${NC}"
            fi
            ;;
        4)
            echo -e "${BLUE}🔍 Actualizando referencias...${NC}"
            git fetch origin
            echo -e "${GREEN}✅ Fetch completado${NC}"
            ;;
        5)
            read -p "Rama remota a traer: " REMOTE_BRANCH
            git pull origin $REMOTE_BRANCH
            echo -e "${GREEN}✅ Cambios traídos de GitHub${NC}"
            ;;
        *)
            echo -e "${RED}❌ Opción inválida${NC}"
            ;;
    esac
    
    sleep 2
}

# Opción 11: Ver historial
view_history() {
    show_header
    echo -e "${BLUE}📜 HISTORIAL DE COMMITS${NC}"
    echo ""
    
    echo "1) Ver últimos 20 commits (rama actual)"
    echo "2) Ver todos los commits (todas las ramas)"
    echo "3) Ver commits con gráfico"
    echo "4) Ver commits de rama específica"
    echo ""
    read -p "Opción: " HIST_OPT
    
    case $HIST_OPT in
        1)
            git log --oneline -20
            ;;
        2)
            git --no-pager log --all --oneline | head -30
            echo ""
            echo -e "${YELLOW}Total:${NC} $(git log --all --oneline | wc -l) commits"
            ;;
        3)
            git log --oneline --graph --decorate --all -20
            ;;
        4)
            echo ""
            git branch -a
            echo ""
            read -p "Rama: " SPECIFIC_BRANCH
            git log --oneline -20 $SPECIFIC_BRANCH
            ;;
        *)
            echo -e "${RED}❌ Opción inválida${NC}"
            ;;
    esac
    
    echo ""
    read -p "Presiona Enter para continuar..."
}

# Opción 12: Limpiar reflog
cleanup_reflog() {
    show_header
    echo -e "${BLUE}🗑️  LIMPIAR REFERENCIAS ANTIGUAS${NC}"
    echo ""
    
    echo -e "${CYAN}Opciones:${NC}"
    echo "1) Ver todas las referencias guardadas (reflog)"
    echo "2) Borrar referencias antiguas (>30 días)"
    echo "3) Borrar TODO el reflog (⚠️  Irreversible)"
    echo ""
    read -p "Opción: " CLEANUP_OPT
    
    case $CLEANUP_OPT in
        1)
            echo -e "${BLUE}📜 Referencias guardadas:${NC}"
            git reflog --all
            echo ""
            read -p "Presiona Enter para continuar..."
            ;;
        2)
            echo -e "${YELLOW}⚠️  Borrando referencias mayores a 30 días...${NC}"
            git reflog expire --expire=30.days.ago --all
            git gc --prune=now
            echo -e "${GREEN}✅ Referencias antiguas eliminadas${NC}"
            sleep 2
            ;;
        3)
            echo -e "${RED}⚠️⚠️⚠️  ESTO ES IRREVERSIBLE${NC}"
            read -p "¿Estás seguro? Escribe 'SI' para confirmar: " CONFIRM_DELETE
            if [[ "$CONFIRM_DELETE" == "SI" ]]; then
                git reflog expire --expire=now --all
                git gc --prune=now
                echo -e "${GREEN}✅ Reflog completamente limpiado${NC}"
            else
                echo "Cancelado."
            fi
            sleep 2
            ;;
        *)
            echo -e "${RED}❌ Opción inválida${NC}"
            sleep 2
            ;;
    esac
}

# Bucle principal
check_git_repo

while true; do
    main_menu
    
    case $OPTION in
        1) view_all_branches ;;
        2) count_commits_all ;;
        3) create_branch ;;
        4) rename_branch ;;
        5) delete_branch ;;
        6) clean_commits ;;
        7) keep_last_n ;;
        8) keep_last_one ;;
        9) delete_specific_commits ;;
        10) sync_github ;;
        11) view_history ;;
        12) cleanup_reflog ;;
        13) 
            echo "👋 ¡Hasta luego!"
            exit 0
            ;;
        *)
            echo -e "${RED}❌ Opción inválida${NC}"
            sleep 2
            ;;
    esac
done
