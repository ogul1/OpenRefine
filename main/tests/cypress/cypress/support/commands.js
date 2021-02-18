// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************

import 'cypress-file-upload';
import 'cypress-wait-until';

/**
 * Return the .facets-container for a given facet name
 */
Cypress.Commands.add('getFacetContainer', (facetName) => {
  return cy
    .get(
      `#refine-tabs-facets .facets-container .facet-container span[bind="titleSpan"]:contains("${facetName}")`,
      { log: false }
    )
    .parentsUntil('.facets-container', { log: false });
});

/**
 * Edit a cell, for a given row index, a column name and a value
 */
Cypress.Commands.add('editCell', (rowIndex, columnName, value) => {
  cy.getCell(rowIndex, columnName)
    .trigger('mouseover')
    .find('a.data-table-cell-edit')
    .click();
  cy.get('.menu-container.data-table-cell-editor textarea').type(value);
  cy.get('.menu-container button[bind="okButton"]').click();
});

/**
 * Ensure a textarea have a value that id equal to the JSON given as parameter
 */
Cypress.Commands.add('assertTextareaHaveJsonValue', (selector, json) => {
  cy.get(selector).then((el) => {
    // expected json needs to be parsed / restringified, to avoid inconsitencies about spaces and tabs
    const present = JSON.parse(el.val());
    cy.expect(JSON.stringify(present)).to.equal(JSON.stringify(json));
  });
});

/**
 * Open OpenRefine
 */
Cypress.Commands.add('visitOpenRefine', (options) => {
  cy.visit(Cypress.env('OPENREFINE_URL'), options);
});

Cypress.Commands.add('createProjectThroughUserInterface', (fixtureFile) => {
  cy.navigateTo('Create Project');

  const uploadFile = { filePath: fixtureFile, mimeType: 'application/csv' };
  cy.get(
    '.create-project-ui-source-selection-tab-body.selected input[type="file"]'
  ).attachFile(uploadFile);
  cy.get(
    '.create-project-ui-source-selection-tab-body.selected button.button-primary'
  ).click();
});

Cypress.Commands.add('doCreateProjectThroughUserInterface', () => {
  cy.get('.default-importing-wizard-header button[bind="nextButton"]').click();
  cy.get('#create-project-progress-message').contains('Done.');

  // workaround to ensure project is loaded
  // cypress does not support window.location = ...
  cy.get('h2').contains('HTTP ERROR 404');
  cy.location().should((location) => {
    expect(location.href).contains(
      Cypress.env('OPENREFINE_URL') + '/__/project?'
    );
  });

  cy.location().then((location) => {
    const projectId = location.href.split('=').slice(-1)[0];
    cy.visitProject(projectId);
    cy.wrap(projectId).as('createdProjectId');
    cy.get('@loadedProjectIds', { log: false }).then((loadedProjectIds) => {
      loadedProjectIds.push(projectId);
      cy.wrap(loadedProjectIds, { log: false })
        .as('loadedProjectIds')
        .then(() => {
          return projectId;
        });
    });
  });
});

/**
 * Cast a whole column to the given type, using Edit Cell / Common transform / To {type}
 */
Cypress.Commands.add('castColumnTo', (selector, target) => {
  cy.get(
    '.data-table th:contains("' + selector + '") .column-header-menu'
  ).click();

  const targetAction = 'To ' + target;

  cy.get('body > .menu-container').eq(0).contains('Edit cells').click();
  cy.get('body > .menu-container').eq(1).contains('Common transforms').click();
  cy.get('body > .menu-container').eq(2).contains(targetAction).click();
});

/**
 * Return the td element for a given row index and column name
 */
Cypress.Commands.add('getCell', (rowIndex, columnName) => {
  const cssRowIndex = rowIndex + 1;
  // first get the header, to know the cell index
  cy.get(`table.data-table thead th[title="${columnName}"]`).then(($elem) => {
    // there are 3 td at the beginning of each row
    const columnIndex = $elem.index() + 3;
    return cy.get(
      `table.data-table tbody tr:nth-child(${cssRowIndex}) td:nth-child(${columnIndex})`
    );
  });
});

/**
 * Make an assertion about the content of a cell, for a given row index and column name
 */
Cypress.Commands.add('assertCellEquals', (rowIndex, columnName, value) => {
  const cssRowIndex = rowIndex + 1;
  // first get the header, to know the cell index
  cy.get(`table.data-table thead th[title="${columnName}"]`).then(($elem) => {
    // there are 3 td at the beginning of each row
    const columnIndex = $elem.index() + 3;
    cy.get(
      `table.data-table tbody tr:nth-child(${cssRowIndex}) td:nth-child(${columnIndex}) div.data-table-cell-content > span`
    ).should(($cellSpan) => {
      if (value == null) {
        // weird, "null" is returned as a string in this case, bug in Chai ?
        expect($cellSpan.text()).equals('null');
      } else {
        expect($cellSpan.text()).equals(value);
      }
    });
  });
});

/**
 * Navigate to one of the entries of the main left menu of OpenRefine (Create Project, Open Project, Import Project, Language Settings)
 */
Cypress.Commands.add('navigateTo', (target) => {
  cy.get('#action-area-tabs li').contains(target).click();
});

/**
 * Wait for OpenRefine to finish an Ajax load
 */
Cypress.Commands.add('waitForOrOperation', () => {
  cy.get('body[ajax_in_progress="true"]');
  cy.get('body[ajax_in_progress="false"]');
});

/**
 * Delete a column from the grid
 */
Cypress.Commands.add('deleteColumn', (columnName) => {
  cy.get('.data-table th[title="' + columnName + '"]').should('exist');
  cy.columnActionClick(columnName, ['Edit column', 'Remove this column']);
  cy.get('.data-table th[title="' + columnName + '"]').should('not.exist');
});

/**
 * Wait until a dialog panel appear
 */
Cypress.Commands.add('waitForDialogPanel', () => {
  cy.get('body > .dialog-container > .dialog-frame').should('be.visible');
});

/**
 * Click on the OK button of a dialog panel
 */
Cypress.Commands.add('confirmDialogPanel', () => {
  cy.get(
    'body > .dialog-container > .dialog-frame .dialog-footer button[bind="okButton"]'
  ).click();
  cy.get('body > .dialog-container > .dialog-frame').should('not.exist');
});

/**
 * Will click on a menu entry for a given column name
 */
Cypress.Commands.add('columnActionClick', (columnName, actions) => {
  cy.get('body[ajax_in_progress="false"]'); // OR must not be loading at the moment, column headers will be detached from the dom
  cy.get(
    '.data-table th:contains("' + columnName + '") .column-header-menu'
  ).click();

  for (let i = 0; i < actions.length; i++) {
    cy.get('body > .menu-container').eq(i).contains(actions[i]).click();
  }
  cy.get('body[ajax_in_progress="false"]');
});

/**
 * Go to a project, given it's id
 */
Cypress.Commands.add('visitProject', (projectId) => {
  cy.visit(Cypress.env('OPENREFINE_URL') + '/project?project=' + projectId);
  cy.get('#project-title').should('exist');
});

/**
 * Load a new project in OpenRefine, and open the project
 * The fixture can be
 *   * an arbitrary array that will be loaded in the grid. The first row is for the columns names
 *   * a file referenced in fixtures.js (food.mini | food.small)
 */
Cypress.Commands.add(
  'loadAndVisitProject',
  (fixture, projectName = Date.now()) => {
    cy.loadProject(fixture, projectName).then((projectId) => {
      cy.visit(Cypress.env('OPENREFINE_URL') + '/project?project=' + projectId);
    });
  }
);

Cypress.Commands.add('assertNotificationContainingText', (text) => {
  cy.get('#notification').should('to.contain', text);
});

Cypress.Commands.add(
  'assertCellNotString',
  (rowIndex, columnName, expectedType) => {
    cy.getCell(rowIndex, columnName)
      .find('.data-table-value-nonstring')
      .should('to.exist');
  }
);

Cypress.Commands.add(
  'loadAndVisitSampleJSONProject',
  (projectName, fixture) => {
    cy.visitOpenRefine();
    cy.navigateTo('Create Project');
    cy.get('#create-project-ui-source-selection-tabs > div')
      .contains('Clipboard')
      .click();

    cy.get('textarea').invoke('val', fixture);
    cy.get(
      '.create-project-ui-source-selection-tab-body.selected button.button-primary'
    )
      .contains('Next »')
      .click();
    cy.get(
      '.default-importing-wizard-header input[bind="projectNameInput"]'
    ).clear();
    cy.get(
      '.default-importing-wizard-header input[bind="projectNameInput"]'
    ).type(projectName);
    // need to disable es-lint as force is required to true, if not then
    // cypress won't detect the element due to `position:fixed` and overlays
    cy.get('[data-cy=element0]') // eslint-disable-line
      .first()
      .scrollIntoView()
      .click({ force: true });
    cy.doCreateProjectThroughUserInterface();
  }
);
