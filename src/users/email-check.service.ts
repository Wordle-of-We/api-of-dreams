import { Injectable } from '@nestjs/common';
import { promises as dns } from 'dns';

@Injectable()
export class EmailCheckService {
  async hasValidMx(email: string): Promise<boolean> {
    const [, domain] = email.split('@');
    if (!domain) return false;
    try {
      const mx = await dns.resolveMx(domain);
      return Array.isArray(mx) && mx.length > 0;
    } catch {
      return false;
    }
  }
}
