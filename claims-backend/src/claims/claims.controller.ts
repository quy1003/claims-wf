import { Controller, Get, Post, Body, Param, HttpStatus, HttpCode } from '@nestjs/common';
import { ClaimsService } from './claims.service';
import { CreateClaimDto, TransitionClaimDto } from '../engine/types';
import { AuditTrailService } from '../engine/audit-trail.service';
import { WorkflowEngineService } from '../engine/workflow-engine.service';

@Controller('claims')
export class ClaimsController {
  constructor(
    private readonly claimsService: ClaimsService,
    private readonly auditTrailService: AuditTrailService,
    private readonly workflowEngine: WorkflowEngineService,
  ) {}

  /**
   * POST /claims
   * Create a new claim asynchronously in database
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateClaimDto) {
    return await this.claimsService.create(dto);
  }

  /**
   * GET /claims
   * Retrieve all claims asynchronously from database
   */
  @Get()
  async findAll() {
    return await this.claimsService.findAll();
  }

  /**
   * GET /claims/:id
   * Retrieve a specific claim with active state and dynamic transitions asynchronously
   */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    const claim = await this.claimsService.findOne(id);
    const config = this.workflowEngine.getConfig();

    // Query state transitions available from the current state
    const availableTransitions = config.transitions
      .filter((transition) => transition.from === claim.currentState)
      .map((transition) => ({
        to: transition.to,
        authorizedRoles: transition.authorizedRoles,
        preconditions: transition.preconditions,
      }));

    return {
      ...claim,
      availableTransitions,
    };
  }

  /**
   * POST /claims/:id/transition
   * Triggers a claim state transition inside a database transaction
   */
  @Post(':id/transition')
  @HttpCode(HttpStatus.OK)
  async transition(@Param('id') id: string, @Body() dto: TransitionClaimDto) {
    return await this.claimsService.transition(id, dto);
  }

  /**
   * GET /claims/:id/audit-trail
   * Retrieves the immutable database history of transitions for the claim
   */
  @Get(':id/audit-trail')
  async getAuditTrail(@Param('id') id: string) {
    // Verify the claim exists first
    await this.claimsService.findOne(id);
    return await this.auditTrailService.findByClaimId(id);
  }
}
