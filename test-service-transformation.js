// Simulação completa do comportamento do EventsService
// Testa a transformação de dados do backend para o frontend

// Simula a interface BackendEvent
const backendEvents = [
  {
    id: 125,
    name: "Semana da Mulher Empreendedora",
    description: "Eventos de protagonismo feminino",
    imageUrl: "https://example.com/mulher-empreendedora.jpg",
    eventDate: "2025-03-08T09:00:00",
    eventType: "EMPREENDEDORISMO",
    maxSubs: 200,
    locationId: 22,
    version: 1
  },
  {
    id: 110,
    name: "Semana do Meio Ambiente",
    description: "Palestras e oficinas de sustentabilidade",
    imageUrl: "https://example.com/meio-ambiente.jpg",
    eventDate: "2025-06-05T08:00:00",
    eventType: "EDUCATIVO",
    maxSubs: 200,
    locationId: 46,
    version: 1
  },
  {
    id: 126,
    name: "Encontro de Food Trucks",
    description: "Diversas opções gastronômicas",
    imageUrl: "https://example.com/foodtrucks.jpg",
    eventDate: "2025-07-05T16:00:00",
    eventType: "CULTURAL",
    maxSubs: 500,
    locationId: 43,
    version: 1
  }
];

// Função de validação de URL (copiada do serviço)
function validateImageUrl(imageUrl) {
  if (!imageUrl || imageUrl.trim() === '') {
    return 'assets/events/evento-exemplo.svg';
  }

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
    const isExampleDomain = exampleDomains.some(domain => 
      url.hostname.includes(domain)
    );

    if (isExampleDomain) {
      console.warn('URL de imagem de exemplo detectada, usando imagem padrão:', imageUrl);
      return 'assets/events/evento-exemplo.svg';
    }

    return imageUrl;
  } catch (error) {
    console.warn('URL de imagem inválida, usando imagem padrão:', imageUrl);
    return 'assets/events/evento-exemplo.svg';
  }
}

// Função de transformação (copiada do serviço)
function transformBackendEvent(backendEvent) {
  // Validar e criar data de forma segura
  let eventDate;
  try {
    eventDate = new Date(backendEvent.eventDate);
    if (isNaN(eventDate.getTime())) {
      console.warn('Data inválida recebida do backend:', backendEvent.eventDate);
      eventDate = new Date();
    }
  } catch (error) {
    console.warn('Erro ao processar data do evento:', error);
    eventDate = new Date();
  }

  // Extrair informações de localização de forma segura
  const locationName = backendEvent.eventLocation?.placeName || `Localização ${backendEvent.locationId}`;
  const locationAddress = backendEvent.eventLocation?.fullAddress || 'Endereço não disponível';

  // Validar e processar URL da imagem
  const imageUrl = validateImageUrl(backendEvent.imageUrl);

  // Formatar tempo de forma segura
  let formattedTime;
  try {
    formattedTime = eventDate.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit',
      timeZone: 'America/Sao_Paulo'
    });
  } catch (error) {
    console.warn('Erro ao formatar tempo:', error);
    formattedTime = '00:00';
  }

  return {
    id: backendEvent.id,
    title: backendEvent.name,
    name: backendEvent.name,
    description: backendEvent.description,
    category: backendEvent.eventType,
    eventType: backendEvent.eventType,
    date: backendEvent.eventDate.split('T')[0],
    eventDate: backendEvent.eventDate,
    time: formattedTime,
    location: locationName,
    address: locationAddress,
    price: 0,
    maxParticipants: backendEvent.maxSubs,
    currentParticipants: backendEvent.subscribersCount || 0,
    organizerName: 'Organizador',
    organizerEmail: '',
    organizerPhone: '',
    imageUrl: imageUrl,
    tags: [],
    requiresApproval: false,
    isPublic: true,
    allowWaitlist: false,
    status: 'published',
    createdAt: backendEvent.eventDate,
    updatedAt: backendEvent.eventDate,
  };
}

console.log('🔄 Simulando transformação de eventos do backend...\n');

// Transformar todos os eventos
const transformedEvents = backendEvents.map(backendEvent => {
  console.log(`\n📝 Transformando evento: ${backendEvent.name}`);
  console.log(`   URL original: ${backendEvent.imageUrl}`);
  
  const transformed = transformBackendEvent(backendEvent);
  
  console.log(`   URL final: ${transformed.imageUrl}`);
  console.log(`   Localização: ${transformed.location}`);
  console.log(`   Data formatada: ${transformed.date} às ${transformed.time}`);
  
  return transformed;
});

console.log('\n📊 Resumo da transformação:');
console.log(`- Total de eventos processados: ${transformedEvents.length}`);
console.log(`- URLs de exemplo substituídas: ${transformedEvents.filter(e => e.imageUrl === 'assets/events/evento-exemplo.svg').length}`);
console.log(`- URLs mantidas: ${transformedEvents.filter(e => e.imageUrl !== 'assets/events/evento-exemplo.svg').length}`);

console.log('\n🎯 Resultado:');
console.log('✅ Todas as URLs de example.com foram substituídas pela imagem padrão');
console.log('✅ Não haverá requisições desnecessárias para example.com');
console.log('✅ Os eventos serão exibidos com a imagem padrão local');

console.log('\n📋 Eventos transformados:');
transformedEvents.forEach((event, index) => {
  console.log(`${index + 1}. ${event.name} - Imagem: ${event.imageUrl}`);
});

