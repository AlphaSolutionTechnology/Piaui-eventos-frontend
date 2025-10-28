// Teste simples para verificar a validação de URLs de imagem
// Simula o método validateImageUrl do serviço

function validateImageUrl(imageUrl) {
  // Se não há URL, retornar imagem padrão
  if (!imageUrl || imageUrl.trim() === '') {
    return 'assets/events/evento-exemplo.svg';
  }

  // Lista de domínios de exemplo que devem ser substituídos
  const exampleDomains = [
    'example.com',
    'placeholder.com',
    'via.placeholder.com',
    'picsum.photos',
    'loremflickr.com',
    'dummyimage.com'
  ];

  try {
    const url = new URL(imageUrl);
    
    // Verificar se é um domínio de exemplo
    const isExampleDomain = exampleDomains.some(domain => 
      url.hostname.includes(domain)
    );

    if (isExampleDomain) {
      console.warn('URL de imagem de exemplo detectada, usando imagem padrão:', imageUrl);
      return 'assets/events/evento-exemplo.svg';
    }

    // Se é uma URL válida e não é de exemplo, retornar como está
    return imageUrl;
  } catch (error) {
    // Se não conseguir fazer parse da URL, usar imagem padrão
    console.warn('URL de imagem inválida, usando imagem padrão:', imageUrl);
    return 'assets/events/evento-exemplo.svg';
  }
}

// Testes com URLs do backend real
const testUrls = [
  'https://example.com/mulher-empreendedora.jpg',
  'https://example.com/meio-ambiente.jpg',
  'https://example.com/foodtrucks.jpg',
  'https://example.com/festival-inverno.jpg',
  'https://example.com/inverno.jpg',
  'https://example.com/danca.jpg',
  'https://example.com/livros2.jpg',
  'https://example.com/pets.jpg',
  'https://example.com/artesanato2.jpg',
  'https://example.com/empregos.jpg',
  'https://via.placeholder.com/300x200',
  'https://picsum.photos/300/200',
  'https://real-image.com/photo.jpg',
  'https://cdn.example.com/image.jpg',
  '',
  null,
  undefined
];

console.log('🧪 Testando validação de URLs de imagem...\n');

testUrls.forEach((url, index) => {
  const result = validateImageUrl(url);
  const status = result === 'assets/events/evento-exemplo.svg' ? '✅ SUBSTITUÍDA' : '✅ MANTIDA';
  console.log(`Teste ${index + 1}: ${url || 'null/undefined'} -> ${result} [${status}]`);
});

console.log('\n📊 Resumo:');
const substituted = testUrls.filter(url => validateImageUrl(url) === 'assets/events/evento-exemplo.svg').length;
const maintained = testUrls.length - substituted;
console.log(`- URLs substituídas: ${substituted}`);
console.log(`- URLs mantidas: ${maintained}`);
console.log(`- Total de testes: ${testUrls.length}`);

console.log('\n🎯 Resultado: As URLs de example.com serão automaticamente substituídas pela imagem padrão!');

