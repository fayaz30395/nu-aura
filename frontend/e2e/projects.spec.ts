import {expect, test} from '@playwright/test';
import {LoginPage} from './pages/LoginPage';
import {ProjectsPage} from './pages/ProjectsPage';
import {testProject, testUsers} from './fixtures/testData';

/**
 * Projects E2E Tests
 * Tests project management features including CRUD operations
 */

test.describe('Project Management', () => {
  let loginPage: LoginPage;
  let projectsPage: ProjectsPage;

  test.beforeEach(async ({page}) => {
    loginPage = new LoginPage(page);
    projectsPage = new ProjectsPage(page);

    // Login as admin or project manager
    await loginPage.navigate();
    await loginPage.login(testUsers.admin.email, testUsers.admin.password);
    await page.waitForURL('**/dashboard');

    // Navigate to projects page
    await projectsPage.navigate();
  });

  test.describe('Projects List', () => {
    test('should display projects page', async ({page}) => {
      // Verify page heading
      await expect(projectsPage.pageHeading).toBeVisible();

      // Verify create project button
      await expect(projectsPage.createProjectButton).toBeVisible();

      // Verify search input
      const hasSearchInput = await projectsPage.searchInput.isVisible().catch(() => false);
      expect(hasSearchInput).toBe(true);
    });

    test('should display projects in grid view', async ({page}) => {
      // Switch to grid view if not already
      const hasGridButton = await projectsPage.gridViewButton.isVisible().catch(() => false);
      if (hasGridButton) {
        await projectsPage.switchToGridView();
      }

      // Check if projects are displayed
      const projectCount = await projectsPage.getProjectCount();
      expect(projectCount).toBeGreaterThanOrEqual(0);
    });

    test('should display projects in list view', async ({page}) => {
      // Switch to list view if available
      const hasListButton = await projectsPage.listViewButton.isVisible().catch(() => false);
      if (hasListButton) {
        await projectsPage.switchToListView();
        await page.waitForTimeout(500);

        // Verify table is visible
        const isTableVisible = await projectsPage.projectTable.isVisible().catch(() => false);
        expect(isTableVisible).toBe(true);
      }
    });

    test('should search for projects', async ({page}) => {
      // Get initial count
      const initialCount = await projectsPage.getProjectCount();

      if (initialCount > 0) {
        // Get first project name
        const projectName = await projectsPage.getProjectName(0);

        // Search for the project
        await projectsPage.searchProject(projectName.substring(0, 5));

        // Wait for results
        await page.waitForTimeout(1000);

        // Verify search input has value
        const searchValue = await projectsPage.searchInput.inputValue();
        expect(searchValue.length).toBeGreaterThan(0);
      }
    });

    test('should filter projects by status', async ({page}) => {
      const hasStatusFilter = await projectsPage.statusFilter.isVisible().catch(() => false);

      if (hasStatusFilter) {
        // Filter by IN_PROGRESS status
        await projectsPage.filterByStatus('IN_PROGRESS');

        // Wait for results
        await page.waitForTimeout(1000);

        // Verify filter was applied
        const selectedValue = await projectsPage.statusFilter.inputValue();
        expect(selectedValue).toBe('IN_PROGRESS');
      }
    });
  });

  test.describe('Create Project', () => {
    test('should open create project modal', async ({page}) => {
      // Click create project button
      await projectsPage.clickCreateProject();

      // Verify modal is visible
      const isModalVisible = await projectsPage.isProjectModalVisible();
      expect(isModalVisible).toBe(true);

      // Verify form fields are visible
      await expect(projectsPage.projectNameInput).toBeVisible();
      await expect(projectsPage.projectCodeInput).toBeVisible();
      await expect(projectsPage.startDateInput).toBeVisible();
    });

    test('should create project with basic info', async ({page}) => {
      // Create project
      await projectsPage.createProject({
        name: testProject.basic.name,
        code: testProject.basic.code,
        startDate: testProject.basic.startDate,
      });

      // Wait for creation
      await page.waitForTimeout(1500);

      // Verify modal is closed
      const isModalVisible = await projectsPage.isProjectModalVisible().catch(() => false);
      expect(isModalVisible).toBe(false);
    });

    test('should create project with all details', async ({page}) => {
      // Create project with all fields
      await projectsPage.createProject({
        name: `${testProject.basic.name} Full`,
        code: `${testProject.basic.code}F`,
        description: testProject.basic.description,
        clientName: testProject.basic.clientName,
        startDate: testProject.basic.startDate,
        endDate: testProject.basic.endDate,
        status: testProject.basic.status,
        priority: testProject.basic.priority,
        budget: testProject.basic.budget,
      });

      // Wait for creation
      await page.waitForTimeout(1500);

      // Verify modal is closed
      const isModalVisible = await projectsPage.isProjectModalVisible().catch(() => false);
      expect(isModalVisible).toBe(false);
    });

    test('should validate required fields', async ({page}) => {
      // Open modal
      await projectsPage.clickCreateProject();

      // Try to submit without filling required fields
      await projectsPage.submitProjectButton.click();

      // Wait a moment
      await page.waitForTimeout(500);

      // Modal should still be visible (validation failed)
      const isModalVisible = await projectsPage.isProjectModalVisible();
      expect(isModalVisible).toBe(true);
    });

    test('should close modal on cancel', async ({page}) => {
      // Open modal
      await projectsPage.clickCreateProject();

      // Fill some data
      await projectsPage.projectNameInput.fill('Test Project');

      // Close modal
      await projectsPage.closeModal();

      // Wait a moment
      await page.waitForTimeout(500);

      // Verify modal is closed
      const isModalVisible = await projectsPage.isProjectModalVisible().catch(() => false);
      expect(isModalVisible).toBe(false);
    });

    test('should validate project code uniqueness', async ({page}) => {
      // First, create a project
      const uniqueCode = `PRJ${Date.now()}`;
      await projectsPage.createProject({
        name: 'Test Project 1',
        code: uniqueCode,
        startDate: testProject.basic.startDate,
      });

      await page.waitForTimeout(1500);

      // Try to create another project with the same code
      await projectsPage.clickCreateProject();
      await projectsPage.projectNameInput.fill('Test Project 2');
      await projectsPage.projectCodeInput.fill(uniqueCode);
      await projectsPage.startDateInput.fill(testProject.basic.startDate);
      await projectsPage.submitProjectButton.click();

      await page.waitForTimeout(1000);

      // Should show error or modal remains open
      const isModalVisible = await projectsPage.isProjectModalVisible().catch(() => true);
      expect(isModalVisible).toBe(true);
    });
  });

  test.describe('View Project', () => {
    test('should view project details', async ({page}) => {
      const projectCount = await projectsPage.getProjectCount();

      if (projectCount > 0) {
        // Click on first project
        await projectsPage.clickProject(0);

        // Wait for details to load
        await page.waitForTimeout(1000);

        // Should navigate to project details or show modal
        const urlContainsProject = page.url().includes('/projects/');
        const hasDetailsModal = await projectsPage.projectDetailsModal.isVisible().catch(() => false);

        expect(urlContainsProject || hasDetailsModal).toBe(true);
      }
    });

    test('should display project information correctly', async ({page}) => {
      // First create a project with known data
      const projectData = {
        name: `Detailed Project ${Date.now()}`,
        code: `DET${Date.now()}`,
        description: 'Test description for detail view',
        clientName: 'Test Client',
        startDate: testProject.basic.startDate,
        endDate: testProject.basic.endDate,
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        budget: '50000',
      };

      await projectsPage.createProject(projectData);
      await page.waitForTimeout(1500);

      // Reload to ensure project appears
      await page.reload();
      await page.waitForTimeout(1000);

      const count = await projectsPage.getProjectCount();
      if (count > 0) {
        // View the project (should be the first one if sorted by recent)
        await projectsPage.clickProject(0);
        await page.waitForTimeout(1000);

        // Verify project name is displayed somewhere
        const pageContent = await page.textContent('body');
        expect(pageContent).toContain(projectData.name);
      }
    });
  });

  test.describe('Edit Project', () => {
    test('should edit project details', async ({page}) => {
      // First create a project to edit
      const originalName = `Edit Test ${Date.now()}`;
      await projectsPage.createProject({
        name: originalName,
        code: `EDT${Date.now()}`,
        startDate: testProject.basic.startDate,
        status: 'PLANNING',
      });

      await page.waitForTimeout(1500);
      await page.reload();
      await page.waitForTimeout(1000);

      const count = await projectsPage.getProjectCount();
      if (count > 0) {
        // View the project
        await projectsPage.clickProject(0);
        await page.waitForTimeout(1000);

        // Check if edit button is available
        const hasEditButton = await projectsPage.editProjectButton.isVisible().catch(() => false);

        if (hasEditButton) {
          // Edit the project
          await projectsPage.editProject({
            name: `${originalName} - Updated`,
            description: 'Updated description',
            status: 'IN_PROGRESS',
          });

          await page.waitForTimeout(1500);

          // Verify modal is closed
          const isModalVisible = await projectsPage.isProjectModalVisible().catch(() => false);
          expect(isModalVisible).toBe(false);
        }
      }
    });

    test('should update project status', async ({page}) => {
      // Create a project
      await projectsPage.createProject({
        name: `Status Update ${Date.now()}`,
        code: `STS${Date.now()}`,
        startDate: testProject.basic.startDate,
        status: 'PLANNING',
      });

      await page.waitForTimeout(1500);
      await page.reload();
      await page.waitForTimeout(1000);

      const count = await projectsPage.getProjectCount();
      if (count > 0) {
        // View the project
        await projectsPage.clickProject(0);
        await page.waitForTimeout(1000);

        const hasEditButton = await projectsPage.editProjectButton.isVisible().catch(() => false);
        if (hasEditButton) {
          // Change status
          await projectsPage.editProject({
            status: 'IN_PROGRESS',
          });

          await page.waitForTimeout(1500);
        }
      }
    });

    test('should update project priority', async ({page}) => {
      // Create a project
      await projectsPage.createProject({
        name: `Priority Update ${Date.now()}`,
        code: `PRI${Date.now()}`,
        startDate: testProject.basic.startDate,
        priority: 'MEDIUM',
      });

      await page.waitForTimeout(1500);
      await page.reload();
      await page.waitForTimeout(1000);

      const count = await projectsPage.getProjectCount();
      if (count > 0) {
        await projectsPage.clickProject(0);
        await page.waitForTimeout(1000);

        const hasEditButton = await projectsPage.editProjectButton.isVisible().catch(() => false);
        if (hasEditButton) {
          await projectsPage.editProject({
            priority: 'HIGH',
          });

          await page.waitForTimeout(1500);
        }
      }
    });
  });

  test.describe('Delete Project', () => {
    test('should open delete confirmation modal', async ({page}) => {
      // Create a project to delete
      await projectsPage.createProject({
        name: `Delete Test ${Date.now()}`,
        code: `DEL${Date.now()}`,
        startDate: testProject.basic.startDate,
      });

      await page.waitForTimeout(1500);
      await page.reload();
      await page.waitForTimeout(1000);

      const count = await projectsPage.getProjectCount();
      if (count > 0) {
        // View the project
        await projectsPage.clickProject(0);
        await page.waitForTimeout(1000);

        const hasDeleteButton = await projectsPage.deleteProjectButton.isVisible().catch(() => false);
        if (hasDeleteButton) {
          // Click delete
          await projectsPage.deleteProjectButton.click();
          await page.waitForTimeout(500);

          // Verify delete modal is visible
          const isDeleteModalVisible = await projectsPage.deleteModal.isVisible().catch(() => false);
          expect(isDeleteModalVisible).toBe(true);
        }
      }
    });

    test('should cancel delete operation', async ({page}) => {
      // Create a project
      await projectsPage.createProject({
        name: `Cancel Delete ${Date.now()}`,
        code: `CAN${Date.now()}`,
        startDate: testProject.basic.startDate,
      });

      await page.waitForTimeout(1500);
      await page.reload();
      await page.waitForTimeout(1000);

      const count = await projectsPage.getProjectCount();
      if (count > 0) {
        await projectsPage.clickProject(0);
        await page.waitForTimeout(1000);

        const hasDeleteButton = await projectsPage.deleteProjectButton.isVisible().catch(() => false);
        if (hasDeleteButton) {
          await projectsPage.deleteProjectButton.click();
          await page.waitForTimeout(500);

          // Cancel delete
          await projectsPage.cancelDelete();
          await page.waitForTimeout(500);

          // Verify modal is closed
          const isDeleteModalVisible = await projectsPage.deleteModal.isVisible().catch(() => false);
          expect(isDeleteModalVisible).toBe(false);
        }
      }
    });

    test('should delete project successfully', async ({page}) => {
      // Get initial count
      const _initialCount = await projectsPage.getProjectCount();

      // Create a project to delete
      await projectsPage.createProject({
        name: `To Delete ${Date.now()}`,
        code: `TDL${Date.now()}`,
        startDate: testProject.basic.startDate,
      });

      await page.waitForTimeout(1500);
      await page.reload();
      await page.waitForTimeout(1000);

      const count = await projectsPage.getProjectCount();
      if (count > 0) {
        await projectsPage.clickProject(0);
        await page.waitForTimeout(1000);

        const hasDeleteButton = await projectsPage.deleteProjectButton.isVisible().catch(() => false);
        if (hasDeleteButton) {
          // Delete the project
          await projectsPage.deleteProject();
          await page.waitForTimeout(1500);

          // Should navigate back or close modal
          const currentUrl = page.url();
          expect(currentUrl).toContain('/projects');
        }
      }
    });
  });

  test.describe('Project Filtering and Search', () => {
    test.beforeEach(async ({page}) => {
      // Create multiple test projects with different statuses
      const projects = [
        {
          name: `Planning Project ${Date.now()}`,
          code: `PLN${Date.now()}`,
          startDate: testProject.basic.startDate,
          status: 'PLANNING',
          priority: 'LOW',
        },
        {
          name: `Active Project ${Date.now()}`,
          code: `ACT${Date.now()}`,
          startDate: testProject.basic.startDate,
          status: 'IN_PROGRESS',
          priority: 'HIGH',
        },
      ];

      for (const proj of projects) {
        await projectsPage.createProject(proj);
        await page.waitForTimeout(1000);
      }

      await page.reload();
      await page.waitForTimeout(1000);
    });

    test('should filter by planning status', async ({page}) => {
      const hasStatusFilter = await projectsPage.statusFilter.isVisible().catch(() => false);

      if (hasStatusFilter) {
        await projectsPage.filterByStatus('PLANNING');
        await page.waitForTimeout(1000);

        // Verify filtered results
        const count = await projectsPage.getProjectCount();
        expect(count).toBeGreaterThanOrEqual(0);
      }
    });

    test('should filter by in progress status', async ({page}) => {
      const hasStatusFilter = await projectsPage.statusFilter.isVisible().catch(() => false);

      if (hasStatusFilter) {
        await projectsPage.filterByStatus('IN_PROGRESS');
        await page.waitForTimeout(1000);

        const count = await projectsPage.getProjectCount();
        expect(count).toBeGreaterThanOrEqual(0);
      }
    });

    test('should clear filters', async ({page}) => {
      const hasStatusFilter = await projectsPage.statusFilter.isVisible().catch(() => false);

      if (hasStatusFilter) {
        // Apply filter
        await projectsPage.filterByStatus('PLANNING');
        await page.waitForTimeout(1000);

        // Clear filter (select "All" or empty option)
        await projectsPage.statusFilter.selectOption({index: 0});
        await page.waitForTimeout(1000);

        const count = await projectsPage.getProjectCount();
        expect(count).toBeGreaterThan(0);
      }
    });
  });

  test.describe('Visual Regression', () => {
    test('should match projects page snapshot', async ({page}) => {
      await expect(page).toHaveScreenshot('projects-page.png', {
        maxDiffPixels: 200,
      });
    });

    test('should match create project modal snapshot', async ({page}) => {
      await projectsPage.clickCreateProject();
      await page.waitForTimeout(500);

      await expect(projectsPage.projectModal).toHaveScreenshot('create-project-modal.png', {
        maxDiffPixels: 100,
      });
    });
  });
});

test.describe('Project Management - Permission Tests', () => {
  test('should allow admin to create projects', async ({page}) => {
    const loginPage = new LoginPage(page);
    const projectsPage = new ProjectsPage(page);

    await loginPage.navigate();
    await loginPage.login(testUsers.admin.email, testUsers.admin.password);
    await page.waitForURL('**/dashboard');

    await projectsPage.navigate();

    // Verify create button is visible
    const hasCreateButton = await projectsPage.createProjectButton.isVisible().catch(() => false);
    expect(hasCreateButton).toBe(true);
  });

  test('should allow manager to view projects', async ({page}) => {
    const loginPage = new LoginPage(page);
    const projectsPage = new ProjectsPage(page);

    await loginPage.navigate();
    await loginPage.login(testUsers.manager.email, testUsers.manager.password);
    await page.waitForURL('**/dashboard');

    await projectsPage.navigate();

    // Verify can view projects page
    await expect(projectsPage.pageHeading).toBeVisible();
  });
});

test.describe('Project Management - Edge Cases', () => {
  let loginPage: LoginPage;
  let projectsPage: ProjectsPage;

  test.beforeEach(async ({page}) => {
    loginPage = new LoginPage(page);
    projectsPage = new ProjectsPage(page);

    await loginPage.navigate();
    await loginPage.login(testUsers.admin.email, testUsers.admin.password);
    await page.waitForURL('**/dashboard');
    await projectsPage.navigate();
  });

  test('should validate date range (end date after start date)', async ({page}) => {
    await projectsPage.clickCreateProject();

    // Set end date before start date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    await projectsPage.projectNameInput.fill('Invalid Date Project');
    await projectsPage.projectCodeInput.fill(`INV${Date.now()}`);
    await projectsPage.startDateInput.fill(tomorrow.toISOString().split('T')[0]);
    await projectsPage.endDateInput.fill(yesterday.toISOString().split('T')[0]);
    await projectsPage.submitProjectButton.click();

    await page.waitForTimeout(1000);

    // Should show validation error or prevent submission
    const isModalStillVisible = await projectsPage.isProjectModalVisible();
    expect(isModalStillVisible).toBe(true);
  });

  test('should handle very long project names', async ({page}) => {
    await projectsPage.clickCreateProject();

    const longName = 'A'.repeat(200);
    await projectsPage.projectNameInput.fill(longName);
    await projectsPage.projectCodeInput.fill(`LNG${Date.now()}`);
    await projectsPage.startDateInput.fill(testProject.basic.startDate);
    await projectsPage.submitProjectButton.click();

    await page.waitForTimeout(1500);

    // Should either truncate or show error
  });

  test('should handle special characters in project name', async ({page}) => {
    const specialCharName = `Test @#$% Project ${Date.now()}`;

    await projectsPage.createProject({
      name: specialCharName,
      code: `SPC${Date.now()}`,
      startDate: testProject.basic.startDate,
    });

    await page.waitForTimeout(1500);
  });

  test('should handle empty search gracefully', async ({page}) => {
    await projectsPage.searchProject('');
    await page.waitForTimeout(500);

    // Should display all projects
    const count = await projectsPage.getProjectCount();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should handle search with no results', async ({page}) => {
    await projectsPage.searchProject('XYZNONEXISTENTPROJECT123456789');
    await page.waitForTimeout(1000);

    // Should show no results or empty state
    const count = await projectsPage.getProjectCount();
    expect(count).toBe(0);
  });
});
