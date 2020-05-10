import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { NoChannelComponent } from './no-channel.component';

describe('NoChannelComponent', () => {
  let component: NoChannelComponent;
  let fixture: ComponentFixture<NoChannelComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ NoChannelComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(NoChannelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
