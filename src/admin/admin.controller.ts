import { Controller, Get, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { KPI } from './dto/kpi.dto';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard';
import { RolesGuard } from '../auth/guard/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('admin/dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminController {
  constructor(private readonly svc: AdminService) {}

  @Get('kpis')
  @Roles(Role.ADMIN)
  kpis(): Promise<KPI> {
    return this.svc.getKPIs();
  }
}
