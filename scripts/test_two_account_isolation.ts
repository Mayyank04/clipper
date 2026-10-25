/**
 * TWO-ACCOUNT WORKSPACE TENANT ISOLATION RELEASE GATE TEST
 *
 * Validates:
 * 1. Project creation in Tenant Alpha (ws_alpha).
 * 2. Tenant Alpha authorized reads.
 * 3. Cross-tenant path forgery rejection (ws_beta attempting to read ws_alpha route returns 403 Forbidden).
 * 4. Cross-tenant ID query rejection (ws_beta attempting to access Alpha's project ID in ws_beta returns 404 Not Found).
 * 5. Cross-tenant mutation rejection (ws_beta PUT to ws_alpha returns 403; PUT to ws_beta returns 404).
 * 6. Cross-tenant deletion rejection (ws_beta DELETE to ws_alpha returns 403; DELETE to ws_beta returns 404).
 * 7. Authorized cleanup by Tenant Alpha returns 200.
 */

const BASE_URL = process.env.TEST_API_URL || 'http://localhost:3001';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`[FAIL] ${msg}`);
    process.exit(1);
  }
  console.log(`[PASS] ${msg}`);
}

async function runTenantIsolationSuite() {
  console.log('====================================================');
  console.log('  MULTI-TENANT WORKSPACE ISOLATION VERIFICATION');
  console.log('====================================================\n');

  const projectId = `proj_sec_isolation_${Date.now()}`;
  const testProject = {
    id: projectId,
    originalTitle: 'Top Secret Tenant Alpha Video',
    channelName: 'Alpha Corp',
    originalDuration: 60,
    originalThumbnail: '/demo/thumb.jpg',
    youtubeUrl: 'https://youtube.com/watch?v=alpha123',
    shorts: [
      {
        id: `short_${projectId}_1`,
        title: 'Alpha Moment 1',
        description: 'Classified transcript',
        hashtags: ['#alpha'],
        keywords: ['security'],
        viralScore: { overall: 95 },
        duration: 25,
        startTime: 10,
        endTime: 35,
        topic: 'Security',
        thumbnail: '/demo/thumb.jpg',
        hookText: 'Confidential Alpha Hook',
        hookCategory: 'curiosity',
        captions: [],
        sfxMarkers: [],
        vfxMarkers: [],
        brollSuggestions: [],
      },
    ],
  };

  // 1. Create Project as Tenant Alpha
  console.log('--- 1. Create Project in Tenant Alpha ---');
  const createRes = await fetch(`${BASE_URL}/api/v1/workspaces/ws_alpha/projects`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-workspace-id': 'ws_alpha',
      'x-user-id': 'user_alpha_admin',
    },
    body: JSON.stringify({ project: testProject }),
  });
  const createData = await createRes.json();
  assert(createRes.status === 201 && createData.success === true, `Tenant Alpha created project (status=${createRes.status})`);

  // 2. Tenant Alpha reads its own project
  console.log('\n--- 2. Tenant Alpha Authorized Read ---');
  const readAlphaRes = await fetch(`${BASE_URL}/api/v1/workspaces/ws_alpha/projects/${projectId}`, {
    method: 'GET',
    headers: {
      'x-workspace-id': 'ws_alpha',
      'x-user-id': 'user_alpha_admin',
    },
  });
  const readAlphaData = await readAlphaRes.json();
  assert(readAlphaRes.status === 200 && readAlphaData.project?.id === projectId, `Tenant Alpha successfully read own project`);
  assert(readAlphaData.project.originalTitle === 'Top Secret Tenant Alpha Video', `Project title matches`);

  // 3. Tenant Beta tries to access Tenant Alpha's route (path forgery attack)
  console.log('\n--- 3. Tenant Beta Cross-Tenant Path Forgery (Expected: 403 Forbidden) ---');
  const attackPathRes = await fetch(`${BASE_URL}/api/v1/workspaces/ws_alpha/projects/${projectId}`, {
    method: 'GET',
    headers: {
      'x-workspace-id': 'ws_beta',
      'x-user-id': 'user_beta_intruder',
    },
  });
  assert(attackPathRes.status === 403, `Server rejected cross-workspace path access with HTTP 403 (status=${attackPathRes.status})`);

  // 4. Tenant Beta queries Alpha's project ID inside Beta's workspace (ID enumeration attack)
  console.log('\n--- 4. Tenant Beta ID Enumeration Inside Own Workspace (Expected: 404 Not Found) ---');
  const attackEnumRes = await fetch(`${BASE_URL}/api/v1/workspaces/ws_beta/projects/${projectId}`, {
    method: 'GET',
    headers: {
      'x-workspace-id': 'ws_beta',
      'x-user-id': 'user_beta_intruder',
    },
  });
  assert(attackEnumRes.status === 404, `Server isolated Alpha project from Beta query with HTTP 404 (status=${attackEnumRes.status})`);

  // 5. Tenant Beta tries to mutate Alpha's project (PUT attack)
  console.log('\n--- 5. Tenant Beta Unauthorized Mutation (PUT) ---');
  const attackPutDirect = await fetch(`${BASE_URL}/api/v1/workspaces/ws_alpha/projects/${projectId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'x-workspace-id': 'ws_beta',
      'x-user-id': 'user_beta_intruder',
    },
    body: JSON.stringify({ project: { originalTitle: 'Hacked Title' } }),
  });
  assert(attackPutDirect.status === 403, `Direct cross-workspace PUT rejected with HTTP 403 (status=${attackPutDirect.status})`);

  const attackPutIndirect = await fetch(`${BASE_URL}/api/v1/workspaces/ws_beta/projects/${projectId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'x-workspace-id': 'ws_beta',
      'x-user-id': 'user_beta_intruder',
    },
    body: JSON.stringify({ project: { originalTitle: 'Hacked Title' } }),
  });
  assert(attackPutIndirect.status === 404, `Indirect cross-workspace PUT rejected with HTTP 404 (status=${attackPutIndirect.status})`);

  // 6. Tenant Beta tries to delete Alpha's project (DELETE attack)
  console.log('\n--- 6. Tenant Beta Unauthorized Deletion (DELETE) ---');
  const attackDelDirect = await fetch(`${BASE_URL}/api/v1/workspaces/ws_alpha/projects/${projectId}`, {
    method: 'DELETE',
    headers: {
      'x-workspace-id': 'ws_beta',
      'x-user-id': 'user_beta_intruder',
    },
  });
  assert(attackDelDirect.status === 403, `Direct cross-workspace DELETE rejected with HTTP 403 (status=${attackDelDirect.status})`);

  const attackDelIndirect = await fetch(`${BASE_URL}/api/v1/workspaces/ws_beta/projects/${projectId}`, {
    method: 'DELETE',
    headers: {
      'x-workspace-id': 'ws_beta',
      'x-user-id': 'user_beta_intruder',
    },
  });
  assert(attackDelIndirect.status === 404, `Indirect cross-workspace DELETE rejected with HTTP 404 (status=${attackDelIndirect.status})`);

  // 7. Tenant Alpha cleans up its own project
  console.log('\n--- 7. Tenant Alpha Authorized Cleanup ---');
  const cleanupRes = await fetch(`${BASE_URL}/api/v1/workspaces/ws_alpha/projects/${projectId}`, {
    method: 'DELETE',
    headers: {
      'x-workspace-id': 'ws_alpha',
      'x-user-id': 'user_alpha_admin',
    },
  });
  assert(cleanupRes.status === 200, `Tenant Alpha successfully deleted own project (status=${cleanupRes.status})`);

  console.log('\n====================================================');
  console.log('MULTI-TENANT ISOLATION SUITE: ALL CHECKS PASSED (10/10)');
  console.log('====================================================');
}

runTenantIsolationSuite().catch((err) => {
  console.error('[FATAL] Suite threw error:', err);
  process.exit(1);
});
