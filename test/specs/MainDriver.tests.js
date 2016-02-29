import MainDriver from '../../src/MainDriver';

import { expect } from 'chai';
import { spy } from 'sinon';

import Promise from 'bluebird';
import Cycle from '@cycle/core';
import { Observable } from 'rx';

import AppStub from '../stubs/App';

const pathNames = [
  'appData', 'desktop', 'documents', 'downloads', 'exe',
  'home', 'module', 'music', 'pictures', 'temp', 'userData', 'videos'
];

describe('MainDriver', () => {
  let app = null, driver = null;

  beforeEach(() => {
    app = new AppStub();
    driver = new MainDriver(app);
  });

  it('quits if isSingleInstance option is true and makeSingleInstance returns true', done => {
    app.makeSingleInstance.returns(true);

    Cycle.run(() => {
      return {
        electron: Observable.just({})
      }
    }, {
      electron: new MainDriver(app, { isSingleInstance: true })
    });

    setTimeout(() => {
      expect(app.quit).to.have.been.called;
      done();
    }, 1);
  });

  describe('source', () => {
    describe('appInfo', () => {
      describe('name property', () => {
        it('calls the getName method of the electron app', done => {
          app.getName.returns('The app name');

          Cycle.run(({ electron }) => {
            return {
              output: Observable.just(electron.appInfo.name)
            };
          }, {
            electron: driver,
            output: value$ => value$.first().forEach(verify)
          });

          function verify(value) {
            expect(value).to.equal('The app name');
            done();
          }
        });
      });

      describe('version property', () => {
        it('calls the getVersion method of the electron app', done => {
          app.getVersion.returns('5.2.4');

          Cycle.run(({ electron }) => {
            return {
              output: Observable.just(electron.appInfo.version)
            };
          }, {
            electron: driver,
            output: value$ => value$.first().forEach(verify)
          });

          function verify(value) {
            expect(value).to.equal('5.2.4');
            done();
          }
        });
      });

      describe('locale property', () => {
        it('calls the getLocale method of the electron app', done => {
          app.getLocale.returns('fr-CA');

          Cycle.run(({ electron }) => {
            return {
              output: Observable.just(electron.appInfo.locale)
            };
          }, {
            electron: driver,
            output: value$ => value$.first().forEach(verify)
          });

          function verify(value) {
            expect(value).to.equal('fr-CA');
            done();
          }
        });
      });
    });

    describe('platformInfo', () => {
      describe('isAeroGlassEnabled property', () => {
        it('calls the isAeroGlassEnabled method of the app', done => {
          app.isAeroGlassEnabled.returns(true);

          Cycle.run(({ electron }) => ({
            output: Observable.just(electron.platformInfo.isAeroGlassEnabled)
          }), {
            electron: driver,
            output: value$ => value$.first().forEach(isEnabled => {
              expect(isEnabled).to.be.true;
              done();
            })
          });
        });
      });
    });

    describe('events', () => {
      describe('function', () => {
        it('listens to the specified event', done => {
          Cycle.run(({ electron }) => {
            return {
              receivedEvent$: electron.events('ready')
            }
          }, {
            electron: driver,
            receivedEvent$: events$ => events$.first().forEach(verify)
          });

          const emittedEvent = {};
          setTimeout(() => app.emit('ready', emittedEvent), 1);

          function verify(e) {
            expect(e).to.equal(emittedEvent);
            done();
          }
        });
      });

      describe('extraLaunch$', () => {
        it('indicates when additional launches are requested in single-instance mode', done => {
          const args = ['arg1', 'arg2'];
          const workingDir = '/some/path';
          app.makeSingleInstance.returns(false);

          Cycle.run(({ electron }) => {
            return {
              output: electron.events.extraLaunch$
            }
          }, {
            electron: new MainDriver(app, { isSingleInstance: true }),
            output: value$ => value$.forEach(assert)
          });

          setTimeout(() => {
            app.makeSingleInstance.lastCall.args[0].call(null, args, workingDir);
          }, 1);

          function assert({ argv, cwd }) {
            expect(argv).to.equal(args);
            expect(cwd).to.equal(workingDir);
            done();
          }
        });
      });

      describe('activation$', () => {
        it('contains activate events with a hasVisibleWindows property', done => {
          Cycle.run(({ electron }) => {
            return {
              verify: electron.events.activation$
            }
          }, {
            electron: driver,
            verify: events$ => events$.first().forEach(verify)
          });

          setTimeout(() => app.emit('activate', { }, true), 1);

          function verify(e) {
            expect(e).to.have.property('hasVisibleWindows', true);
            done();
          }
        });
      });

      describe('loginPrompt$', () => {
        it('contains login events with additional details', done => {
          Cycle.run(({ electron }) => {
            return {
              output: electron.events.loginPrompt$
            }
          }, {
            electron: driver,
            output: event$ => event$.first().forEach(verify)
          });

          const webContents = {};
          const request = { url: 'https://somedomain.com/' };
          const authInfo = { };
          const callback = () => { };
          setTimeout(() => app.emit('login', { }, webContents, request, authInfo, callback), 1);

          function verify(e) {
            expect(e).to.have.property('webContents', webContents);
            expect(e).to.have.property('request', request);
            expect(e).to.have.property('authInfo', authInfo);
            done();
          }
        });
      });

      describe('clientCertPrompt$', () => {
        it('contains select-client-certificate events with additional details', done => {
          Cycle.run(({ electron }) => {
            return {
              output: electron.events.clientCertPrompt$
            }
          }, {
            electron: driver,
            output: event$ => event$.first().forEach(verify)
          });

          const webContents = {};
          const url = 'https://somedomain.com/';
          const certificateList = [
            { data: 'PEM data', issuerName: 'issuer' },
            { data: 'PEM data 2', issuerName: 'issuer2' }
          ];
          const callback = trust => { };
          setTimeout(() => app.emit('select-client-certificate', { }, webContents, url, certificateList, callback), 1);

          function verify(e) {
            expect(e).to.have.property('url', url);
            expect(e).to.have.property('certificateList', certificateList);
            done();
          }
        });
      });

      describe('certError$', () => {
        it('contains certificate-error events containing additional details', done => {
          Cycle.run(({ electron }) => {
            return {
              output: electron.events.certError$
            }
          }, {
            electron: driver,
            output: event$ => event$.first().forEach(verify)
          });

          const webContents = {};
          const url = 'https://somedomain.com/';
          const error = new Error();
          const certificate = { data: 'PEM data', issuerName: 'issuer' };
          const callback = trust => { };
          setTimeout(() => app.emit('certificate-error', { }, webContents, url, error, certificate, callback), 1);

          function verify(e) {
            expect(e).to.have.property('url', url);
            expect(e).to.have.property('error', error);
            expect(e).to.have.property('certificate', certificate);
            done();
          }
        });
      });

      describe('windowOpen$', () => {
        it('contains browser-window-created events with a window property', done => {
          Cycle.run(({ electron }) => {
            return {
              output: electron.events.windowOpen$
            }
          }, {
            electron: driver,
            output: event$ => event$.first().forEach(verify)
          });

          const window = {};
          setTimeout(() => app.emit('browser-window-created', { }, window), 1);

          function verify(e) {
            expect(e).to.have.property('window', window);
            done();
          }
        });
      });

      describe('windowFocus$', () => {
        it('contains browser-window-focus events with a window property', done => {
          Cycle.run(({ electron }) => {
            return {
              output: electron.events.windowFocus$
            }
          }, {
            electron: driver,
            output: event$ => event$.first().forEach(verify)
          });

          const window = {};
          setTimeout(() => app.emit('browser-window-focus', { }, window), 1);

          function verify(e) {
            expect(e).to.have.property('window', window);
            done();
          }
        });
      });

      describe('windowBlur$', () => {
        it('contains browser-window-blur events with a window property', done => {
          Cycle.run(({ electron }) => {
            return {
              output: electron.events.windowBlur$
            }
          }, {
            electron: driver,
            output: event$ => event$.first().forEach(verify)
          });

          const window = {};
          setTimeout(() => app.emit('browser-window-blur', { }, window), 1);

          function verify(e) {
            expect(e).to.have.property('window', window);
            done();
          }
        });
      });

      describe('gpuProcessCrash$', () => {
        it('emits when gpu-process-crashed events occur', done => {
          Cycle.run(({ electron }) => {
            return {
              output: electron.events.gpuProcessCrash$
            }
          }, {
            electron: driver,
            output: event$ => event$.first().forEach(verify)
          });

          const event = { };
          setTimeout(() => app.emit('gpu-process-crashed', event), 1);

          function verify(e) {
            expect(e).to.equal(event);
            done();
          }
        });
      });
    });

    describe('path', () => {
      describe('.app$ property', () => {
        it('calls the getAppPath app method', done => {
          app.getAppPath.returns('/some/path');

          Cycle.run(({ electron }) => {
            return {
              output: electron.paths.app$
            }
          }, {
            electron: driver,
            output: path$ => path$.first().forEach(verify)
          });

          function verify(path) {
            expect(path).to.equal('/some/path');
            done();
          }
        });
      });

      pathNames.forEach(key => {
        describe(`.${key}$ property`, () => {
          it(`calls the getPath app method with a "${key}" parameter`, done => {
            app.getPath.withArgs(key).returns('/some/path');

            Cycle.run(({ electron }) => {
              return {
                output: electron.paths[`${key}$`]
              }
            }, {
              electron: driver,
              output: path$ => path$.first().forEach(verify)
            });

            function verify(path) {
              expect(path).to.equal('/some/path');
              done();
            }
          });
        });
      });
    });

    describe('badgeLabel$', () => {
      it('reflects the current and future badge labels', done => {
        app.dock.getBadge.returns('Label 1');
        let valueCount = 0;

        Cycle.run(({ electron }) => ({
          electron: Observable.just({
            dock: {
              badgeLabel$: Observable.timer(5).map('Label 2')
            }
          }),
          output: electron.badgeLabel$
        }), {
          electron: driver,
          output: value$ => value$.forEach(label => {
            valueCount++;
            expect(label).to.equal(`Label ${valueCount}`);
            if (valueCount === 2) {
              expect(app.dock.setBadge).to.have.been.calledWith('Label 2');
              done();
            }
          })
        });
      });
    })
  });

  describe('sink', () => {
    describe('quit$', () => {
      it('causes the electron app to quit', done => {
        Cycle.run(() => {
          return {
            electron: Observable.just({
              quit$: Observable.just({})
            })
          }
        }, {
          electron: driver
        });

        setTimeout(() => {
          expect(app.quit).to.have.been.called;
          done();
        }, 1);
      });
    });

    describe('exit$', () => {
      it('causes an exit with code 0 by default', done => {
        Cycle.run(() => {
          return {
            electron: Observable.just({
              exit$: Observable.just({})
            })
          }
        }, {
          electron: driver
        });

        setTimeout(() => {
          expect(app.exit).to.have.been.calledWith(0);
          done();
        }, 1);
      });

      it('exits with a numeric exit code when a value is sent', done => {
        Cycle.run(() => {
          return {
            electron: Observable.just({
              exit$: Observable.just(-23)
            })
          }
        }, {
          electron: driver
        });

        setTimeout(() => {
          expect(app.exit).to.have.been.calledWith(-23);
          done();
        }, 1);
      });
    });

    describe('clientCertSelection$', () => {
      it('prevents the default cert selection behavior and uses a custom certificate selection', done => {
        Cycle.run(({ electron }) => {
          return {
            electron: Observable.just({
              clientCertSelection$: electron.events.clientCertPrompt$
                .map(e => ({ prompt: e, cert: e.certificateList[1] }))
            })
          }
        }, {
          electron: driver
        });

        const event1 = {
          event: { preventDefault: spy() },
          certs: [{ }, { }],
          callback: spy()
        };

        setTimeout(() => {
          app.emit('select-client-certificate', event1.event, {}, '', event1.certs, event1.callback);
          expect(event1.event.preventDefault).to.have.been.called;
          expect(event1.callback).to.have.been.calledWith(event1.certs[1]);

          done();
        }, 1);
      });
    });

    describe('trustedCert$', () => {
      it('prevents the default behavior of an untrusted cert and trusts it instead', done => {
        Cycle.run(({ electron }) => {
          return {
            electron: Observable.just({
              trustedCert$: electron.events.certError$.filter(e => e.certificate.issuerName === 'trusted.issuer.com')
            })
          }
        }, {
          electron: driver
        });

        const event1 = {
          event: { preventDefault: spy() },
          cert: { issuerName: 'trusted.issuer.com' },
          callback: spy()
        };
        const event2 = {
          event: { preventDefault: spy() },
          cert: { issuerName: 'other.issuer.com' },
          callback: spy()
        };

        setTimeout(() => {
          app.emit('certificate-error', event1.event, {}, '', {}, event1.cert, event1.callback);
          expect(event1.event.preventDefault).to.have.been.called;
          expect(event1.callback).to.have.been.calledWith(true);

          app.emit('certificate-error', event2.event, {}, '', {}, event2.cert, event2.callback);
          expect(event2.event.preventDefault).to.have.not.been.called;
          expect(event2.callback).to.have.not.been.called;

          done();
        }, 1);
      });
    });

    describe('login$', () => {
      it('prevents the default behavior and sends the username & password', done => {
        Cycle.run(({ electron }) => {
          return {
            electron: Observable.just({
              login$: electron.events.loginPrompt$.map(e => ({ prompt: e, username: 'foo', password: 'bar' }))
            })
          }
        }, {
          electron: driver
        });

        const event = { preventDefault: spy() };
        const callback = spy();

        setTimeout(() => {
          app.emit('login', event, {}, {}, {}, callback);
          expect(event.preventDefault).to.have.been.called;
          expect(callback).to.have.been.calledWith('foo', 'bar');

          done();
        }, 1);
      });
    });

    describe('pathUpdates', () => {
      pathNames.forEach(key => {
        const prop = `${key}$`;
        describe(prop, () => {
          it(`updates the ${key} electron path`, done => {
            app.getPath.withArgs(key).returns('/old/value');

            Cycle.run(({ electron }) => {
              return {
                electron: Observable.just({
                  pathUpdates: {
                    [prop]: Observable.just('/new/value')
                  }
                }),
                output: electron.paths[prop]
              }
            }, {
              electron: driver,
              output: $values => $values.skip(1).first().forEach(assert)
            });

            function assert(value) {
              expect(value).to.equal('/new/value');
              expect(app.setPath).to.have.been.calledWith(key, value);
              done();
            }
          });
        });
      });
    });

    describe('recentDocs', () => {
      describe('add$', () => {
        it('calls the addRecentDocument app method', done => {
          Cycle.run(() => {
            return {
              electron: Observable.just({
                recentDocs: {
                  add$: Observable.just('/some/path')
                }
              })
            }
          }, { electron: driver });

          setTimeout(() => {
            expect(app.addRecentDocument).to.have.been.calledWith('/some/path');
            done();
          }, 1)
        });
      });

      describe('clear$', () => {
        it('calls the clearRecentDocuments app method', done => {
          Cycle.run(() => {
            return {
              electron: Observable.just({
                recentDocs: {
                  clear$: Observable.just({})
                }
              })
            }
          }, { electron: driver });

          setTimeout(() => {
            expect(app.clearRecentDocuments).to.have.been.called;
            done();
          }, 1)
        });
      });
    });

    describe('userTask$', () => {
      const tasks = [{ title: 'Task 1' }, { title: 'Task 2' }];

      it('calls the setUserTasks method of the app', done => {
        Cycle.run(() => {
          return {
            electron: Observable.just({
              userTask$: Observable.just(tasks)
            })
          };
        }, { electron: driver });

        setTimeout(() => {
          expect(app.setUserTasks).to.have.been.calledWith(tasks);
          done();
        }, 1);
      });
    })

    describe('dock', () => {
      describe('bounce', () => {
        describe('start$', () => {
          it('invokes app.dock.bounce method with "informational" type by default', () => {
            return testBounceStart({}, () => {
              expect(app.dock.bounce).to.have.been.calledWith('informational');
            })
          });

          it('invokes app.dock.bounce method with a specific type if provided', () => {
            return testBounceStart({ type: 'critical' }, () => {
              expect(app.dock.bounce).to.have.been.calledWith('critical');
            })
          });

          function testBounceStart(bounce, assertions) {
            return new Promise(resolve => {
              Cycle.run(() => ({
                electron: Observable.just({
                  dock: {
                    bounce: {
                      start$: Observable.just(bounce)
                    }
                  }
                })
              }), { electron: driver });

              setTimeout(() => {
                assertions();
                resolve();
              }, 1)
            });
          }
        });

        describe('cancel$', () => {
          it('causes previously-started bounces to be cancelled', done => {
            app.dock.bounce.returns(8346);

            Cycle.run(() => ({
              electron: Observable.just({
                dock: {
                  bounce: {
                    start$: Observable.just({ id: 'auth-has-expired', type: 'critical' }),
                    cancel$: Observable.timer(5).map(() => 'auth-has-expired')
                  }
                }
              })
            }), { electron: driver });

            setTimeout(() => {
              expect(app.dock.cancelBounce).to.have.been.calledWith(8346);
              done();
            }, 20)
          });
        });
      });

      describe('visibility$', () => {
        it('hides the dock when producing `false` values', () => {
          return testVisibility(false, () => {
            expect(app.dock.hide).to.have.been.called;
          })
        });

        it('shows the dock when producing `true` values', () => {
          return testVisibility(true, () => {
            expect(app.dock.show).to.have.been.called;
          })
        });

        function testVisibility(value, assertions) {
          return new Promise(resolve => {
            Cycle.run(() => ({
              electron: Observable.just({
                dock: {
                  visibility$: Observable.just(value)
                }
              })
            }), { electron: driver });

            setTimeout(() => {
              assertions();
              resolve();
            }, 1);
          });
        }
      });

      describe('icon$', () => {
        it('causes app.dock.setIcon to be called', done => {
          const img = {};

          Cycle.run(() => ({
            electron: Observable.just({
              dock: {
                icon$: Observable.just(img)
              }
            })
          }), { electron: driver });

          setTimeout(() => {
            expect(app.dock.setIcon).to.have.been.calledWith(img);
            done();
          }, 1)
        });
      });

      describe('menu$', () => {
        it('causes app.dock.setMenu to be called', done => {
          const menu = {};

          Cycle.run(() => ({
            electron: Observable.just({
              dock: {
                menu$: Observable.just(menu)
              }
            })
          }), { electron: driver });

          setTimeout(() => {
            expect(app.dock.setMenu).to.have.been.calledWith(menu);
            done();
          }, 1);
        });
      });
    });

    describe('newChromiumParam$', () => {
      it('calls appendSwitch and appendArgument for each switch & argument', done => {
        Cycle.run(() => ({
          electron: Observable.just({
            newChromiumParam$: Observable.just({
              switches: [
                { 'switch': 'prefetch', value: 1 },
                { 'switch': 'aggressive-cache-discard' }
              ],
              args: [
                'some arg'
              ]
            })
          })
        }), { electron: driver });

        setTimeout(() => {
          expect(app.appendSwitch).to.have.been.calledWith('prefetch', 1);
          expect(app.appendSwitch).to.have.been.calledWith('aggressive-cache-discard');
          expect(app.appendArgument).to.have.been.calledWith('some arg');
          done();
        }, 1);
      });
    });

    describe('ntlmAllowedOverride$', () => {
      it('calls the allowNTLMCredentialsForAllDomains app method', done => {
        Cycle.run(() => {
          return {
            electron: Observable.just({
              ntlmAllowedOverride$: Observable.just(true)
            })
          }
        }, { electron: driver });

        setTimeout(() => {
          expect(app.allowNTLMCredentialsForAllDomains).to.have.been.calledWith(true);
          done();
        }, 1)
      });
    });

    describe('appUserModelId$', () => {
      it('causes the setAppUserModelId method of the app to be called', done => {
        Cycle.run(() => ({
          electron: Observable.just({
            appUserModelId$: Observable.just('new-user-model-id')
          })
        }), { electron: driver });

        setTimeout(() => {
          expect(app.setAppUserModelId).to.have.been.calledWith('new-user-model-id');
          done();
        }, 1);
      });
    });
  });
});
