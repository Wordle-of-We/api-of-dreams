import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { Request } from 'express'
import { JwtPayload } from '../strategies/jwt-payload.interface'

type RequestWithUser = Request & { user?: { userId: number; email: string } }

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithUser>()
    const authHeader = request.headers['authorization']
    const token =
      typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
        ? authHeader.slice(7)
        : null

    if (!token) {
      throw new UnauthorizedException('Token não encontrado')
    }

    try {
      const decoded = this.jwtService.verify<JwtPayload>(token, {
        secret: process.env.JWT_SECRET || 'supersecret',
      })
      request.user = { userId: decoded.sub, email: decoded.email }
      return true
    } catch {
      throw new UnauthorizedException('Token inválido ou expirado')
    }
  }
}
