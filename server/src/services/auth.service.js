import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import config from '../config/index.js';
import { supabaseAdmin } from '../config/supabase.js';
import ApiError from '../utils/ApiError.js';

class AuthService {
  generateAccessToken(userId, role, gymId) {
    return jwt.sign(
      { userId, role, gymId },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );
  }

  generateRefreshToken(userId) {
    return jwt.sign(
      { userId, type: 'refresh' },
      config.jwt.secret,
      { expiresIn: config.jwt.refreshExpiresIn }
    );
  }

  async login(email, password) {
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();

    if (error || !user) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    if (!user.is_active) {
      throw ApiError.forbidden('Account is deactivated. Contact your administrator.');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    const accessToken = this.generateAccessToken(user.user_id, user.role, user.gym_id);
    const refreshToken = this.generateRefreshToken(user.user_id);

    // Store refresh token
    await supabaseAdmin
      .from('refresh_tokens')
      .insert({
        token_id: uuidv4(),
        user_id: user.user_id,
        token: refreshToken,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      });

    const { password_hash, ...userWithoutPassword } = user;
    return {
      user: userWithoutPassword,
      accessToken,
      refreshToken,
    };
  }

  async refreshToken(token) {
    try {
      const decoded = jwt.verify(token, config.jwt.secret);
      if (decoded.type !== 'refresh') {
        throw ApiError.unauthorized('Invalid refresh token');
      }

      // Check if refresh token exists and is not revoked
      const { data: storedToken, error: tokenError } = await supabaseAdmin
        .from('refresh_tokens')
        .select('*')
        .eq('token', token)
        .eq('is_revoked', false)
        .single();

      if (tokenError || !storedToken) {
        throw ApiError.unauthorized('Refresh token is invalid or revoked');
      }

      const { data: user, error: userError } = await supabaseAdmin
        .from('users')
        .select('user_id, role, gym_id, is_active')
        .eq('user_id', decoded.userId)
        .single();

      if (userError || !user || !user.is_active) {
        throw ApiError.unauthorized('User not found or deactivated');
      }

      // Revoke old refresh token
      await supabaseAdmin
        .from('refresh_tokens')
        .update({ is_revoked: true })
        .eq('token_id', storedToken.token_id);

      // Generate new tokens
      const newAccessToken = this.generateAccessToken(user.user_id, user.role, user.gym_id);
      const newRefreshToken = this.generateRefreshToken(user.user_id);

      await supabaseAdmin
        .from('refresh_tokens')
        .insert({
          token_id: uuidv4(),
          user_id: user.user_id,
          token: newRefreshToken,
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        });

      return { accessToken: newAccessToken, refreshToken: newRefreshToken };
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw ApiError.unauthorized('Invalid refresh token');
    }
  }

  async logout(userId, refreshToken) {
    if (refreshToken) {
      await supabaseAdmin
        .from('refresh_tokens')
        .update({ is_revoked: true })
        .eq('user_id', userId)
        .eq('token', refreshToken);
    } else {
      // Revoke all tokens for the user
      await supabaseAdmin
        .from('refresh_tokens')
        .update({ is_revoked: true })
        .eq('user_id', userId);
    }
  }

  async requestPasswordReset(email) {
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('user_id, email, full_name')
      .eq('email', email.toLowerCase())
      .single();

    if (!user) {
      // Don't reveal whether the email exists
      return { message: 'If the email exists, a reset link has been sent' };
    }

    const resetToken = uuidv4();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

    await supabaseAdmin
      .from('password_resets')
      .insert({
        reset_id: uuidv4(),
        user_id: user.user_id,
        token: resetToken,
        expires_at: expiresAt,
      });

    // In production, send email here. For now, return the token for testing.
    return {
      message: 'If the email exists, a reset link has been sent',
      ...(config.env === 'development' && { resetToken }),
    };
  }

  async resetPassword(token, newPassword) {
    const { data: resetRecord, error } = await supabaseAdmin
      .from('password_resets')
      .select('*')
      .eq('token', token)
      .eq('is_used', false)
      .single();

    if (error || !resetRecord) {
      throw ApiError.badRequest('Invalid or expired reset token');
    }

    if (new Date(resetRecord.expires_at) < new Date()) {
      throw ApiError.badRequest('Reset token has expired');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await supabaseAdmin
      .from('users')
      .update({ password_hash: passwordHash })
      .eq('user_id', resetRecord.user_id);

    await supabaseAdmin
      .from('password_resets')
      .update({ is_used: true })
      .eq('reset_id', resetRecord.reset_id);

    // Revoke all refresh tokens
    await supabaseAdmin
      .from('refresh_tokens')
      .update({ is_revoked: true })
      .eq('user_id', resetRecord.user_id);

    return { message: 'Password reset successfully' };
  }

  async changePassword(userId, currentPassword, newPassword) {
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('password_hash')
      .eq('user_id', userId)
      .single();

    if (!user) throw ApiError.notFound('User not found');

    const isValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValid) throw ApiError.badRequest('Current password is incorrect');

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await supabaseAdmin
      .from('users')
      .update({ password_hash: passwordHash })
      .eq('user_id', userId);

    return { message: 'Password changed successfully' };
  }
}

export default new AuthService();
