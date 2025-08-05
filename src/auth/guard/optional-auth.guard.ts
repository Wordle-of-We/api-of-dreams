import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common'
import { JwtAuthGuard } from './jwt-auth.guard'

@Injectable()
export class OptionalAuthGuard extends JwtAuthGuard {
  canActivate(context: ExecutionContext): boolean {
    try {
      return super.canActivate(context)
    } catch (err) {
      if (err instanceof UnauthorizedException) {
        return true
      }
      throw err
    }
  }
}
