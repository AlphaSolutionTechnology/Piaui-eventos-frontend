/**
 * ViaCEP API Response interface
 * Matches the backend ViaCepResponse DTO
 */
export interface ViaCepResponse {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
}
