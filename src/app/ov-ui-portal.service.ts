import { Injectable } from '@angular/core';
import { TemplatePortal } from '@angular/cdk/portal';
import { Subject } from 'rxjs';

/**
 * @interface PortalInfo
 * interface for portal content to load
 */
export interface PortalInfo {
  /**
   * @property portalContent
   * is mandatory to display temaplet in template portal
   */
  portalContent: TemplatePortal;

  /**
   * @property targetElementRefId
   * is mandatory property to track scroll event and position of overlay content
   * with no targetElementRefId it will be difficult to position the overlay content
   */
  targetElementRefId: string;
  /**
   * @property overlayPointerEvents
   * is optional property to set the pointer events of overlay container and overlay position box.
   * `none` will be default, so that background elements can be accessible
   * `auto` | `all` will effect interaction with background elements
   */
  overlayPointerEvents?: 'auto' | 'all' | 'none' | undefined;
}

/**
 * @interface PortalEvents
 *
 */
export interface PortalEvents {
  click?: MouseEvent;
  scroll?: Event;
}
@Injectable({
  providedIn: 'root',
})
export class OvUiPortalService {
  /**
   * @property portalInfo
   * is the object with portal data
   */
  private portalInfo = new Subject<PortalInfo>();
  readonly portalInfo$ = this.portalInfo.asObservable();

  private portalEvents = new Subject<PortalEvents>();
  readonly portalEvents$ = this.portalEvents.asObservable();
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  constructor() {}

  /**
   *
   * @param portalInfo
   */
  setPortalInfo(portalInfo: PortalInfo) {
    this.portalInfo.next(portalInfo);
  }

  setPortalEvents(domEvent: PortalEvents) {
    this.portalEvents.next(domEvent);
  }
}
