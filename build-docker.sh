#!/bin/bash

# Script para build e deploy do Piaui Eventos
# Uso: ./build-docker.sh [dev|prod]

set -e

ENV=${1:-prod}

echo "🚀 Iniciando build do Piaui Eventos Frontend..."
echo "📦 Ambiente: $ENV"

# Cores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Limpar builds anteriores
echo -e "${BLUE}🧹 Limpando builds anteriores...${NC}"
rm -rf dist/
rm -rf .angular/cache

# Build da aplicação
echo -e "${BLUE}📦 Executando build de produção...${NC}"
npm run build

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Build concluído com sucesso!${NC}"
else
    echo -e "${YELLOW}❌ Erro no build!${NC}"
    exit 1
fi

# Build da imagem Docker
echo -e "${BLUE}🐳 Construindo imagem Docker...${NC}"
docker build -t piaui-eventos-frontend:latest .

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Imagem Docker criada com sucesso!${NC}"
else
    echo -e "${YELLOW}❌ Erro ao criar imagem Docker!${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}🎉 Build completo!${NC}"
echo ""
echo "Para iniciar os containers:"
echo "  docker-compose up -d"
echo ""
echo "Para ver os logs:"
echo "  docker-compose logs -f frontend"
echo ""
echo "Para parar os containers:"
echo "  docker-compose down"
echo ""
