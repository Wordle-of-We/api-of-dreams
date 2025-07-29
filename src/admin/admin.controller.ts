import { Controller, Get, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { KPI } from './dto/kpi.dto';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@UseGuards(JwtAuthGuard)
@Roles(Role.ADMIN)
@Controller('admin/dashboard')
export class AdminController {
  constructor(private readonly svc: AdminService) { }

  @Get('kpis')
  kpis(): Promise<KPI> {
    return this.svc.getKPIs();
  }
}
