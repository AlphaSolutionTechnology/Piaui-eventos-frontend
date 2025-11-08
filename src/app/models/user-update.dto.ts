/**
 * DTO for updating user profile information
 * Corresponds to backend UserUpdateDTO
 */
export interface UserUpdateDTO {
  name?: string;
  email?: string;
  phoneNumber?: string;
}

/**
 * DTO for updating user password
 * Corresponds to backend PasswordUpdateDTO
 */
export interface PasswordUpdateDTO {
  currentPassword: string;
  newPassword: string;
}
