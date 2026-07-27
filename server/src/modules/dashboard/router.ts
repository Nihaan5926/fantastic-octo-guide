import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../../db/knex';
import { authenticate } from '../../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/kpis', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const firstOfMonth = new Date();
    firstOfMonth.setDate(1);
    firstOfMonth.setHours(0, 0, 0, 0);

    const now = new Date();

    // avgApprovalTime: avg hours from created_at to published_at for APPROVED reports
    let avgApprovalTime = 0;
    const approvalRows = await db('intelligence_reports')
      .where('status', 'APPROVED')
      .whereNotNull('published_at')
      .whereNotNull('created_at')
      .select(
        db.raw('EXTRACT(EPOCH FROM (published_at - created_at)) / 3600 AS hours')
      );
    if (approvalRows.length > 0) {
      const totalHours = (approvalRows as any[]).reduce((sum: number, r: any) => sum + parseFloat(r.hours), 0);
      avgApprovalTime = Math.round((totalHours / approvalRows.length) * 10) / 10;
    }

    // caseClosureRate: % cases closed vs total this month
    let caseClosureRate = 0;
    const [{ count: totalCasesThisMonth }] = await db('cases')
      .where('created_at', '>=', firstOfMonth)
      .count();
    const [{ count: closedCasesThisMonth }] = await db('cases')
      .where('created_at', '>=', firstOfMonth)
      .where('status', 'CLOSED')
      .count();
    const totalC = parseInt(totalCasesThisMonth as string, 10);
    const closedC = parseInt(closedCasesThisMonth as string, 10);
    if (totalC > 0) {
      caseClosureRate = Math.round((closedC / totalC) * 1000) / 10;
    }

    // sourceProductivity: reports per active source this month
    let sourceProductivity = 0;
    const [{ count: activeSourcesCount }] = await db('sources')
      .where('status', 'ACTIVE')
      .count();
    const [{ count: reportsThisMonth }] = await db('intelligence_reports')
      .where('created_at', '>=', firstOfMonth)
      .count();
    const srcCount = parseInt(activeSourcesCount as string, 10);
    const rptCount = parseInt(reportsThisMonth as string, 10);
    if (srcCount > 0) {
      sourceProductivity = Math.round((rptCount / srcCount) * 10) / 10;
    }

    // osintVolume: total collected items count
    const [{ count: osintItemsCount }] = await db('osint_collected_items').count();
    const osintVolume = parseInt(osintItemsCount as string, 10);

    res.json({
      data: {
        avgApprovalTime,
        caseClosureRate,
        sourceProductivity,
        osintVolume,
      },
    });
  } catch (e) { next(e); }
});

export default router;
