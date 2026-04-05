import {Locator, Page} from '@playwright/test';
import {BasePage} from './BasePage';

/**
 * Projects Page Object Model
 * Handles all interactions with the project management page
 */
export class ProjectsPage extends BasePage {
  // Locators
  readonly pageHeading: Locator;
  readonly createProjectButton: Locator;
  readonly projectsGrid: Locator;
  readonly projectCards: Locator;
  readonly projectTable: Locator;
  readonly tableRows: Locator;

  // View toggles
  readonly gridViewButton: Locator;
  readonly listViewButton: Locator;

  // Create/Edit project modal
  readonly projectModal: Locator;
  readonly projectNameInput: Locator;
  readonly projectCodeInput: Locator;
  readonly projectDescriptionInput: Locator;
  readonly clientNameInput: Locator;
  readonly startDateInput: Locator;
  readonly endDateInput: Locator;
  readonly statusSelect: Locator;
  readonly prioritySelect: Locator;
  readonly budgetInput: Locator;
  readonly projectManagerSelect: Locator;
  readonly teamMembersSelect: Locator;
  readonly submitProjectButton: Locator;
  readonly cancelProjectButton: Locator;

  // Filters
  readonly statusFilter: Locator;
  readonly searchInput: Locator;
  readonly searchButton: Locator;

  // Project details
  readonly projectDetailsModal: Locator;
  readonly editProjectButton: Locator;
  readonly deleteProjectButton: Locator;
  readonly addTaskButton: Locator;

  // Delete confirmation
  readonly deleteModal: Locator;
  readonly confirmDeleteButton: Locator;
  readonly cancelDeleteButton: Locator;

  constructor(page: Page) {
    super(page);

    // Page elements
    this.pageHeading = page.locator('h1').filter({hasText: /Projects|Project Management/i});
    this.createProjectButton = page.locator('button:has-text("Create Project")');
    this.projectsGrid = page.locator('[class*="grid"]').filter({has: page.locator('[class*="project-card"]')});
    this.projectCards = page.locator('[class*="project-card"]');
    this.projectTable = page.locator('table');
    this.tableRows = page.locator('tbody tr');

    // View toggles
    this.gridViewButton = page.locator('button[aria-label*="Grid View"]');
    this.listViewButton = page.locator('button[aria-label*="List View"]');

    // Create/Edit modal
    this.projectModal = page.locator('div.fixed.inset-0').filter({hasText: /Create Project|Edit Project/i});
    this.projectNameInput = page.locator('label:has-text("Project Name")').locator('..').locator('input');
    this.projectCodeInput = page.locator('label:has-text("Project Code")').locator('..').locator('input');
    this.projectDescriptionInput = page.locator('textarea[placeholder*="description"]');
    this.clientNameInput = page.locator('label:has-text("Client Name")').locator('..').locator('input');
    this.startDateInput = page.locator('label:has-text("Start Date")').locator('..').locator('input');
    this.endDateInput = page.locator('label:has-text("End Date")').locator('..').locator('input');
    this.statusSelect = page.locator('label:has-text("Status")').locator('..').locator('select');
    this.prioritySelect = page.locator('label:has-text("Priority")').locator('..').locator('select');
    this.budgetInput = page.locator('label:has-text("Budget")').locator('..').locator('input');
    this.projectManagerSelect = page.locator('label:has-text("Project Manager")').locator('..').locator('select');
    this.teamMembersSelect = page.locator('label:has-text("Team Members")').locator('..').locator('select');
    this.submitProjectButton = page.locator('button:has-text("Create Project"), button:has-text("Save Changes")').last();
    this.cancelProjectButton = page.locator('button:has-text("Cancel")');

    // Filters
    this.statusFilter = page.locator('select').filter({hasText: /Status|All Projects/});
    this.searchInput = page.locator('input[placeholder*="Search projects"]');
    this.searchButton = page.locator('button:has-text("Search")');

    // Project details
    this.projectDetailsModal = page.locator('div.fixed.inset-0').filter({hasText: /Project Details/i});
    this.editProjectButton = page.locator('button:has-text("Edit Project")');
    this.deleteProjectButton = page.locator('button:has-text("Delete Project")');
    this.addTaskButton = page.locator('button:has-text("Add Task")');

    // Delete confirmation
    this.deleteModal = page.locator('div.fixed.inset-0').filter({hasText: 'Delete Project'});
    this.confirmDeleteButton = page.locator('button:has-text("Delete")').last();
    this.cancelDeleteButton = this.deleteModal.locator('button:has-text("Cancel")');
  }

  /**
   * Navigate to projects page
   */
  async navigate() {
    await this.goto('/projects');
    await this.waitForPageLoad();
  }

  /**
   * Click create project button
   */
  async clickCreateProject() {
    await this.createProjectButton.click();
    await this.projectModal.waitFor({state: 'visible'});
  }

  /**
   * Create a new project
   */
  async createProject(data: {
    name: string;
    code: string;
    description?: string;
    clientName?: string;
    startDate: string;
    endDate?: string;
    status?: string;
    priority?: string;
    budget?: string;
    projectManager?: string;
    teamMembers?: string[];
  }) {
    await this.clickCreateProject();

    await this.projectNameInput.fill(data.name);
    await this.projectCodeInput.fill(data.code);
    if (data.description) await this.projectDescriptionInput.fill(data.description);
    if (data.clientName) await this.clientNameInput.fill(data.clientName);
    await this.startDateInput.fill(data.startDate);
    if (data.endDate) await this.endDateInput.fill(data.endDate);
    if (data.status) await this.statusSelect.selectOption(data.status);
    if (data.priority) await this.prioritySelect.selectOption(data.priority);
    if (data.budget) await this.budgetInput.fill(data.budget);
    if (data.projectManager) await this.projectManagerSelect.selectOption(data.projectManager);

    if (data.teamMembers && data.teamMembers.length > 0) {
      for (const member of data.teamMembers) {
        await this.teamMembersSelect.selectOption(member);
      }
    }

    await this.submitProjectButton.click();
    await this.wait(1000);
  }

  /**
   * Search for project
   */
  async searchProject(query: string) {
    await this.searchInput.fill(query);
    await this.searchButton.click();
    await this.waitForPageLoad();
  }

  /**
   * Filter by status
   */
  async filterByStatus(status: string) {
    await this.statusFilter.selectOption(status);
    await this.waitForPageLoad();
  }

  /**
   * Get project count
   */
  async getProjectCount(): Promise<number> {
    const isGridView = await this.projectsGrid.isVisible();
    if (isGridView) {
      return await this.projectCards.count();
    } else {
      return await this.tableRows.count();
    }
  }

  /**
   * Click on project by index (works for both grid and list view)
   */
  async clickProject(index: number = 0) {
    const isGridView = await this.projectsGrid.isVisible();
    if (isGridView) {
      await this.projectCards.nth(index).click();
    } else {
      await this.tableRows.nth(index).locator('button:has-text("View")').click();
    }
    await this.wait(1000);
  }

  /**
   * Get project name by index
   */
  async getProjectName(index: number = 0): Promise<string> {
    const isGridView = await this.projectsGrid.isVisible();
    if (isGridView) {
      return await this.projectCards.nth(index).locator('h3, h4').first().textContent() || '';
    } else {
      return await this.tableRows.nth(index).locator('td').first().textContent() || '';
    }
  }

  /**
   * Switch to grid view
   */
  async switchToGridView() {
    if (await this.gridViewButton.isVisible()) {
      await this.gridViewButton.click();
      await this.wait(500);
    }
  }

  /**
   * Switch to list view
   */
  async switchToListView() {
    if (await this.listViewButton.isVisible()) {
      await this.listViewButton.click();
      await this.wait(500);
    }
  }

  /**
   * Edit project
   */
  async editProject(data: Partial<{
    name: string;
    description: string;
    status: string;
    priority: string;
    budget: string;
  }>) {
    await this.editProjectButton.click();
    await this.projectModal.waitFor({state: 'visible'});

    if (data.name) await this.projectNameInput.fill(data.name);
    if (data.description) await this.projectDescriptionInput.fill(data.description);
    if (data.status) await this.statusSelect.selectOption(data.status);
    if (data.priority) await this.prioritySelect.selectOption(data.priority);
    if (data.budget) await this.budgetInput.fill(data.budget);

    await this.submitProjectButton.click();
    await this.wait(1000);
  }

  /**
   * Delete project
   */
  async deleteProject() {
    await this.deleteProjectButton.click();
    await this.deleteModal.waitFor({state: 'visible'});
    await this.confirmDeleteButton.click();
    await this.wait(1000);
  }

  /**
   * Cancel delete
   */
  async cancelDelete() {
    await this.cancelDeleteButton.click();
  }

  /**
   * Close project modal
   */
  async closeModal() {
    await this.cancelProjectButton.click();
  }

  /**
   * Get project status by index
   */
  async getProjectStatus(index: number = 0): Promise<string> {
    const isGridView = await this.projectsGrid.isVisible();
    if (isGridView) {
      return await this.projectCards.nth(index).locator('[class*="badge"]').textContent() || '';
    } else {
      return await this.tableRows.nth(index).locator('td').nth(3).textContent() || '';
    }
  }

  /**
   * Verify project modal is visible
   */
  async isProjectModalVisible(): Promise<boolean> {
    return await this.projectModal.isVisible();
  }
}
