#!/bin/bash
# Declaration Hub API - Utilitaires utiles
# Mettez ce fichier dans API/ et rendez-le exécutable: chmod +x utils.sh

set -e

VENV_PATH=".venv"
if [ ! -d "$VENV_PATH" ]; then
    echo "❌ Virtualenv not found at $VENV_PATH"
    exit 1
fi

source "$VENV_PATH/bin/activate"

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_section() {
    echo -e "\n${BLUE}=== $1 ===${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Commands
case "${1:-help}" in
    check)
        print_section "Django System Check"
        python manage.py check
        print_success "All checks passed"
        ;;
    
    test)
        print_section "Running Tests"
        python manage.py test core.tests --verbosity=2
        ;;
    
    test-sync)
        print_section "Testing SyncAPIView"
        python manage.py test core.tests.SyncAPIViewTestCase --verbosity=2
        ;;
    
    migrations)
        print_section "Checking Migrations"
        python manage.py showmigrations
        ;;
    
    makemigrations)
        print_section "Creating Migrations"
        python manage.py makemigrations core
        ;;
    
    migrate)
        print_section "Applying Migrations"
        python manage.py migrate
        print_success "Migrations applied"
        ;;
    
    cleanup)
        print_section "Cleaning Old Data (DRY RUN)"
        python manage.py cleanup_retention --dry-run
        print_warning "Use 'cleanup-now' to actually delete"
        ;;
    
    cleanup-now)
        print_section "⚠️  PERMANENTLY Cleaning Old Data"
        read -p "Are you sure? (yes/no) " -n 3 -r
        echo
        if [[ $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
            python manage.py cleanup_retention
            print_success "Cleanup completed"
        else
            print_warning "Cleanup cancelled"
        fi
        ;;
    
    shell)
        print_section "Django Shell"
        python manage.py shell
        ;;
    
    admin)
        print_section "Create Admin User"
        python manage.py createsuperuser
        ;;
    
    runserver)
        print_section "Starting Django Server"
        echo "Access: http://127.0.0.1:8000"
        echo "Admin: http://127.0.0.1:8000/admin"
        echo "API Docs: http://127.0.0.1:8000/api/docs"
        python manage.py runserver 0.0.0.0:8000
        ;;
    
    runserver-bg)
        print_section "Starting Django Server (Background)"
        nohup python manage.py runserver 0.0.0.0:8000 > /tmp/django.log 2>&1 &
        sleep 2
        echo "PID: $!"
        print_success "Server started (output: /tmp/django.log)"
        echo "Access: http://127.0.0.1:8000"
        ;;
    
    stop-server)
        print_section "Stopping Django Server"
        pkill -f "python manage.py runserver" || true
        sleep 1
        print_success "Server stopped"
        ;;
    
    logs)
        print_section "Django Server Logs"
        tail -50 /tmp/django.log
        ;;
    
    metrics)
        print_section "API Metrics (requires AUTH)"
        TOKEN="${2:-}"
        if [ -z "$TOKEN" ]; then
            print_error "Usage: $0 metrics <JWT_TOKEN>"
            exit 1
        fi
        curl -s -H "Authorization: Bearer $TOKEN" \
            http://127.0.0.1:8000/api/admin/metrics/ | python -m json.tool
        ;;
    
    pending)
        print_section "Pending Declarations (requires AUTH)"
        TOKEN="${2:-}"
        if [ -z "$TOKEN" ]; then
            print_error "Usage: $0 pending <JWT_TOKEN>"
            exit 1
        fi
        curl -s -H "Authorization: Bearer $TOKEN" \
            http://127.0.0.1:8000/api/pending-declarations/ | python -m json.tool
        ;;
    
    sessions)
        print_section "Admin Sessions (requires AUTH)"
        TOKEN="${2:-}"
        if [ -z "$TOKEN" ]; then
            print_error "Usage: $0 sessions <JWT_TOKEN>"
            exit 1
        fi
        curl -s -H "Authorization: Bearer $TOKEN" \
            http://127.0.0.1:8000/api/admin-sessions/ | python -m json.tool
        ;;
    
    heartbeat)
        print_section "Session Heartbeat (requires AUTH)"
        TOKEN="${2:-}"
        if [ -z "$TOKEN" ]; then
            print_error "Usage: $0 heartbeat <JWT_TOKEN>"
            exit 1
        fi
        curl -s -X POST -H "Authorization: Bearer $TOKEN" \
            http://127.0.0.1:8000/api/admin-sessions/heartbeat/ | python -m json.tool
        ;;
    
    backup)
        print_section "Backup Database"
        BACKUP_FILE="db_backup_$(date +%Y%m%d_%H%M%S).sqlite3"
        cp db.sqlite3 "$BACKUP_FILE"
        print_success "Database backed up to: $BACKUP_FILE"
        ;;
    
    docs)
        print_section "API Documentation"
        echo "Swagger UI: http://127.0.0.1:8000/api/docs/"
        echo "ReDoc: http://127.0.0.1:8000/api/redoc/"
        echo "Schema (OpenAPI): http://127.0.0.1:8000/api/schema/"
        ;;
    
    info)
        print_section "API Information"
        echo "Framework: Django 5.2.9"
        echo "API: Django REST Framework"
        echo "Auth: JWT (SimpleJWT)"
        echo "Database: SQLite (development)"
        echo ""
        echo "Key features:"
        echo "  • Admin actions for batch processing"
        echo "  • Session management with heartbeat"
        echo "  • Data retention policies (configurable)"
        echo "  • Observability metrics"
        echo "  • Comprehensive testing suite"
        echo ""
        print_success "See API/IMPROVEMENTS_SUMMARY.md for details"
        ;;
    
    help|*)
        echo -e "\n${BLUE}Declaration Hub API - Utility Commands${NC}\n"
        echo "Usage: $0 <command> [args]\n"
        echo "Commands:"
        echo "  ${GREEN}Server${NC}"
        echo "    runserver          Start development server (foreground)"
        echo "    runserver-bg       Start development server (background)"
        echo "    stop-server        Stop running server"
        echo "    logs               Show server logs"
        echo ""
        echo "  ${GREEN}Testing${NC}"
        echo "    check              Run Django system checks"
        echo "    test               Run all tests"
        echo "    test-sync          Run SyncAPIView tests only"
        echo ""
        echo "  ${GREEN}Database${NC}"
        echo "    migrations         List all migrations"
        echo "    makemigrations     Create new migrations"
        echo "    migrate            Apply migrations"
        echo "    backup             Backup database"
        echo "    cleanup            Preview old data deletion (dry-run)"
        echo "    cleanup-now        ⚠️  Actually delete old data"
        echo ""
        echo "  ${GREEN}Admin${NC}"
        echo "    admin              Create superuser"
        echo "    shell              Django shell"
        echo ""
        echo "  ${GREEN}API Operations${NC}"
        echo "    metrics <TOKEN>    View API metrics"
        echo "    pending <TOKEN>    List pending declarations"
        echo "    sessions <TOKEN>   List admin sessions"
        echo "    heartbeat <TOKEN>  Send session heartbeat"
        echo ""
        echo "  ${GREEN}Info${NC}"
        echo "    docs               Show API docs URLs"
        echo "    info               Show API information"
        echo "    help               Show this help message"
        echo ""
        ;;
esac
