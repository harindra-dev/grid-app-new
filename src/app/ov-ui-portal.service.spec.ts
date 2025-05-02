import { TestBed } from '@angular/core/testing';

import { OvUiPortalService } from './ov-ui-portal.service';

describe('OvUiPortalService', () => {
  let service: OvUiPortalService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(OvUiPortalService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
