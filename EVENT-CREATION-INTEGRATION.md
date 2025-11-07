# Event Creation API Integration

This document describes the implementation of event creation functionality in the Piauí Eventos frontend, integrating with the backend API.

## Overview

The event creation feature allows users to create new events through a multi-step form. The frontend sends event data to the backend API endpoint `POST /api/events` using the `EventRequestDTO` format.

**NEW:** The form now includes CEP (ZIP code) lookup functionality that automatically fills the address field using the ViaCEP API integration via `/api/location/{cep}`.

## API Integration

### Endpoint
- **URL**: `POST /api/events`
- **Content-Type**: `application/json`
- **Authentication**: JWT token (via AuthInterceptor)

### Request Format

The frontend sends data in the following format (EventRequestDTO):

```typescript
{
  "name": "string",              // Event title
  "description": "string",       // Event description
  "imageUrl": "string",          // Event image URL or path
  "eventDate": "2024-11-07T14:30:00",  // ISO 8601 LocalDateTime format
  "eventType": "string",         // Category (CULTURAL, ESPORTIVO, etc.)
  "maxSubs": number,             // Maximum subscribers
  "location": {
    "placeName": "string",       // Location name
    "fullAddress": "string",     // Full address
    "zipCode": "string",          // **REQUIRED** CEP (8 digits)
    "latitude": "string",         // Optional latitude (defaults to "0")
    "longitude": "string",        // Optional longitude (defaults to "0")
    "category": "string"          // Optional location category
  }
}
```

### Response Format

On successful creation (HTTP 201), the API returns:

```typescript
{
  "id": number,
  "name": "string",
  "description": "string",
  "imageUrl": "string",
  "eventDate": "2024-11-07T14:30:00",
  "eventType": "string",
  "maxSubs": number,
  "subscribedCount": number,
  "location": EventLocationDTO,
  "version": number
}
```

## CEP (ZIP Code) Lookup Feature

### Overview
The form now includes an integrated CEP lookup that automatically fills the address field when the user enters a valid Brazilian ZIP code.

### How It Works

1. User enters CEP in format `XXXXX-XXX` or `XXXXXXXX`
2. User clicks the "Buscar" (Search) button
3. Frontend calls `GET /api/location/{cep}` endpoint
4. Backend queries ViaCEP API and returns address data
5. Address field is automatically populated with the full address

### CEP API Endpoint

- **URL**: `GET /api/location/{cep}`
- **Method**: GET
- **Parameter**: `cep` - 8-digit CEP (numbers only)

### ViaCEP Response Format

```typescript
{
  "cep": "64000-000",
  "logradouro": "Rua Example",
  "complemento": "",
  "bairro": "Centro",
  "localidade": "Teresina",
  "uf": "PI"
}
```

### Frontend Implementation

The address is auto-formatted as:
```
{logradouro}{, complemento}, {bairro} - {localidade}/{uf}
```

Example: `Rua Example, Centro - Teresina/PI`

## Implementation Details

### Files Modified/Created

1. **src/app/models/event-request.dto.ts** (CREATED)
   - TypeScript interfaces matching backend DTOs
   - `EventRequestDTO`, `EventResponseDTO`, `EventLocationDTO`

2. **src/app/models/viacep-response.interface.ts** (NEW)
   - Interface for ViaCEP API response
   - `ViaCepResponse` with CEP data fields

3. **src/app/models/api-event.interface.ts** (MODIFIED)
   - Added `zipCode?: string` field to ApiEvent interface

4. **src/app/services/events.service.ts** (MODIFIED)
   - Added `getAddressByCep()`: Fetches address from `/api/location/{cep}`
   - Updated `mapToEventRequestDTO()`: Now includes zipCode in location object
   - Improved error handling for CEP lookup

5. **src/app/pages/create-event/create-event.ts** (MODIFIED)
   - Added `zipCode` field to CreateEventForm interface
   - Added `searchAddressByCep()`: Calls API and auto-fills address
   - Added `formatCep()`: Formats CEP as user types (XXXXX-XXX)
   - Added `isLoadingAddress` and `cepError` state variables
   - Updated validation to require valid 8-digit CEP
   - Updated `onSubmit()`: Includes zipCode in event data

6. **src/app/pages/create-event/create-event.html** (MODIFIED)
   - Added CEP input field with search button
   - Added loading state for address lookup
   - Added error display for invalid CEP
   - Added help text explaining auto-fill feature

7. **src/app/pages/create-event/create-event.css** (MODIFIED)
   - Added `.cep-search-container` styles
   - Added `.btn-search-cep` button styles
   - Added `.error-text` and `.help-text` styles
   - Added `input.error` state styles

## User Experience Flow

### Step 1: Basic Information
- Event title, description, category

### Step 2: Event Details (with CEP lookup)
1. **CEP Input**:
   - User enters CEP (formatted automatically as XXXXX-XXX)
   - Click "Buscar" button to fetch address
   - Loading state shows "Buscando..."
   - On success: Address field auto-fills
   - On error: Error message displays

2. **Date & Time**:
   - Select event date (must be future date)
   - Select event time

3. **Location**:
   - Enter location name (e.g., "Centro de Convenções")
   - Address is auto-filled from CEP lookup

4. **Capacity**:
   - Set maximum participants
   - Optional price

### Step 3: Organizer Information
- Organizer name, email, phone

### Submission
1. All validations pass (including CEP validation)
2. Data is formatted and sent to API
3. Success modal displays
4. Redirect to events list

## Date/Time Handling

The frontend collects date and time separately:
- Date: `YYYY-MM-DD` format from date input
- Time: `HH:mm` format from time input

These are combined into ISO 8601 LocalDateTime format for the API:
```typescript
const eventDateTime = `${date}T${time}:00`;
// Example: "2024-11-07T14:30:00"
```

## Location Data

Location information includes:
- `zipCode`: 8-digit CEP (required, validated)
- `location`: Place name entered by user
- `address`: Auto-filled from CEP or manually entered

These are mapped to `EventLocationDTO`:
```typescript
{
  placeName: location,
  fullAddress: address,
  zipCode: zipCode, // Clean CEP (numbers only)
  latitude: "0",    // Default value
  longitude: "0",   // Default value
  category: eventType
}
```

## Validation

### CEP Validation
- Required field
- Must be 8 digits (after removing formatting)
- Format: `XXXXX-XXX` (auto-formatted)
- Real-time validation feedback
- API validation on search

### Other Validations
- All required fields must be filled
- Email must be valid format
- Date must be in the future
- Max participants > 0
- Phone number required

## Error Handling

The implementation handles various error scenarios:

| Status Code | User Message |
|------------|--------------|
| 0 (No connection) | "Sem conexão com a internet. Verifique sua conexão e tente novamente." |
| 400 (Bad Request) | "Dados inválidos. Verifique os campos e tente novamente." |
| 401/403 (Unauthorized) | "Você não tem permissão para criar eventos. Faça login novamente." |
| 500 (Server Error) | "Erro no servidor ao criar evento. Tente novamente mais tarde." |
| CEP Not Found | "CEP não encontrado. Verifique o número digitado." |
| Other | "Erro ao criar evento. Verifique os dados e tente novamente." |

## Testing Checklist

- [x] CEP field formats input as XXXXX-XXX
- [x] CEP search button disabled when CEP < 8 digits
- [x] Loading state displays during address lookup
- [x] Valid CEP auto-fills address field
- [x] Invalid CEP shows error message
- [x] Form validates CEP is 8 digits
- [x] Form validation works for all required fields
- [x] Date must be in the future
- [x] Valid email format for organizer
- [x] API call sends correct DTO format with zipCode
- [x] Success creates event and redirects
- [x] Error messages display correctly
- [ ] Test with various CEP formats
- [ ] Test network error handling

## Future Enhancements

1. **Geocoding**: Use lat/long from CEP for map display
2. **Location Autocomplete**: Suggest locations based on address
3. **Image Upload**: Implement proper image upload service
4. **Draft Saving**: Allow users to save events as drafts
5. **Validation**: Display specific backend validation errors
6. **Rich Text**: Support rich text formatting in description
7. **Recurring Events**: Support for recurring event creation
8. **Map Preview**: Show location on map after CEP lookup

## Environment Configuration

Ensure `environment.ts` and `environment.prod.ts` have correct API URL:

```typescript
export const environment = {
  API_URL: 'http://localhost:8080/api' // or production URL
};
```

---

**Last Updated**: November 7, 2025  
**Version**: 2.0 (Added CEP Lookup Feature)
