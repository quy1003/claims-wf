import { Controller, Post, Param, ParseIntPipe, HttpStatus, HttpCode } from '@nestjs/common';
import { ScenariosService, ScenarioReport } from './scenarios.service';

@Controller('scenarios')
export class ScenariosController {
  constructor(private readonly scenariosService: ScenariosService) {}

  /**
   * POST /scenarios/run/:index
   * Runs a test scenario programmatically (index 1 to 6)
   */
  @Post('run/:index')
  @HttpCode(HttpStatus.OK)
  async runScenario(@Param('index', ParseIntPipe) index: number): Promise<ScenarioReport> {
    return this.scenariosService.runScenario(index);
  }
}
