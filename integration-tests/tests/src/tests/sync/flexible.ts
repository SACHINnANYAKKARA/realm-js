////////////////////////////////////////////////////////////////////////////
//
// Copyright 2021 Realm Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//
////////////////////////////////////////////////////////////////////////////

import { expect } from "chai";
import { authenticateUserBefore, importAppBefore, openRealmBeforeEach } from "../../hooks";

import { PersonSchema } from "../../schemas/person-and-dog-with-object-ids";

describe("Flexible sync", function () {
  function addDefaultSubscription(options?: Realm.SubscriptionOptions = undefined) {
    return addSubscription(this.realm.objects("Person"), options);
  }

  function addSubscription(query: unknown, options?: Realm.SubscriptionOptions = undefined) {
    const subs = this.realm.getSubscriptions();
    let sub;

    subs.write(function () {
      sub = subs.add(query, options);
    });

    return { subs, sub };
  }

  describe("Realm.getSubscriptions()", function () {
    it("returns a SubscriptionSet", function () {
      expect(realm.getSubscriptions()).to.be.instanceOf(Realm.SubscriptionSet);
    });
  });

  describe("SubscriptionSet", function () {
    beforeEach(function () {
      this.realm = new Realm({ schema: [PersonSchema], sync: { flexible: true } });
    });

    afterEach(function () {
      // tear down realm
    });

    describe("#empty", function () {
      it("returns true if no subscriptions exist", function () {
        expect(this.realm.getSubscriptions().empty).to.be.true;
      });

      it("returns false if subscriptions exist", function () {
        const { subs } = addDefaultSubscription();

        expect(subs.empty).to.be.false;
      });

      it("returns true if a subscription is added then removed", function () {
        const subs = this.realm.getSubscriptions();
        let sub;

        expect(subs.empty).to.be.true;

        subs.write(function () {
          sub = subs.add(this.realm.objects("Person"));
        });

        expect(subs.empty).to.be.false;

        subs.write(function () {
          subs.removeSubscription(sub);
        });

        expect(subs.empty).to.be.true;
      });
    });

    describe("#findByName", function () {
      it("returns null if the named subscription does not exist", function () {
        expect(this.realm.getSubscriptions().findByName("test")).to.be.null;
      });

      it("returns the named subscription", function () {
        const { subs, sub } = addDefaultSubscription({ name: "test" });

        expect(subs.findByName("test")).to.equal(sub);
      });
    });

    describe("#find", function () {
      it("returns null if the query is not subscribed to", function () {
        expect(this.realm.getSubscriptions().find(this.realm.objects("person"))).to.be.null;
      });

      it("returns a query's subscription by reference", function () {
        const query = this.realm.objects("Person");
        const { subs, sub } = addSubscription(query);

        expect(subs.find(query)).to.equal(sub);
      });

      it("returns a filtered query's subscription", function () {
        const query = this.realm.objects("Person").filtered("age > 10");
        const { subs, sub } = addSubscription(query);

        expect(subs.find(query)).to.equal(sub);
      });

      it("returns a sorted query's subscription", function () {
        const query = this.realm.objects("Person").sorted("age");
        const { subs, sub } = addSubscription(query);

        expect(subs.find(query)).to.equal(sub);
      });

      it("returns a filtered and sorted query's subscription", function () {
        const query = this.realm.objects("Person").sorted("age");
        const { subs, sub } = addSubscription(query);

        expect(subs.find(query)).to.equal(sub);
      });

      it("returns a query with equivalent RQL respresentation's subscription", function () {
        const { subs, sub } = addDefaultSubscription();

        expect(subs.find(this.realm.objects("Person"))).to.equal(sub);
      });

      describe("#state", function () {
        it("is Pending by default", function () {
          const subs = this.realm.getSubscriptions();
          expect(subs.state).to.equal(Realm.SubscriptionState.Pending);
        });

        // TOOD do we want to duplicate tests from waitForSynchronisation here?
      });

      describe("#error", function () {
        it("is null by default", function () {
          const subs = this.realm.getSubscriptions();
          expect(subs.error).to.be.null;
        });

        it("is null if there was no error synchronising subscriptions", async function () {
          const { subs } = addDefaultSubscription();
          await subs.waitForSynchronization();

          expect(subs.error).to.be.null;
        });

        it("is contains the error if there was an error synchronising subscriptions", async function () {
          const { subs } = addDefaultSubscription();
          // TODO simulate error
          await subs.waitForSynchronization();

          expect(subs.error).to.be.instanceOf(Error);
          // TODO check more stuff about the error
        });
      });

      describe("#waitForSynchronization", function () {
        it("waits for subscriptions to be in a ready state", async function () {
          const { subs } = addDefaultSubscription();
          expect(subs.state).to.equal(Realm.SubscriptionState.Pending);

          await subs.waitForSynchronization();

          expect(subs.state).to.equal(Realm.SubscriptionState.Ready);
        });

        it("resolves if subscriptions are already in a ready state", async function () {
          const { subs } = addDefaultSubscription();
          await subs.waitForSynchronization();
          await subs.waitForSynchronization();

          expect(subs.state).to.equal(Realm.SubscriptionState.Ready);
        });

        it("throws if there is an error synchronising subscriptions", async function () {
          const { subs } = addDefaultSubscription();
          expect(subs.state).to.equal(Realm.SubscriptionState.Pending);

          // TODO simulate error
          await subs.waitForSynchronization();

          expect(subs.state).to.equal(Realm.SubscriptionState.Error);
        });

        it("throws if another client updates subscriptions while waiting for synchronisation", function () {
          // TODO what is the proper way to do this?
          const otherClientRealm = new Realm({ schema: [PersonSchema], sync: { flexible: true } });

          const { subs } = addDefaultSubscription();

          const otherClientSubs = otherClientRealm.getSubscriptions();

          expect(
            Promise.all([
              otherClientSubs.write(function () {
                otherClientSubs.add(this.realm.objects("Person"));
              }),
              subs.waitForSynchronization(),
            ]),
          ).throws("xxx");
          expect(subs.state).to.equal(Realm.SubscriptionState.Error);
        });
      });

      describe("#write/#writeAsync", function () {
        it("throws an error if SubscriptionSet.add is called outside of a write/writeAsync() callback", function () {
          const subs = this.realm.getSubscriptions();

          expect(function () {
            subs.add(this.realm.objects("Person"));
          }).throws("Cannot modify subscriptions outside of a SubscriptionSet.write transaction.");
        });

        it("throws an error if SubscriptionSet.remvove is called outside of a write/writeAsync() callback", function () {
          const { subs, sub } = addDefaultSubscription();

          expect(function () {
            subs.remove(sub);
          }).throws("Cannot modify subscriptions outside of a SubscriptionSet.write transaction.");
        });

        describe("#write", function () {
          it("does not throw an error if SubscriptionSet.add is called inside a write() callback", function () {
            const subs = this.realm.getSubscriptions();

            expect(function () {
              subs.write(function () {
                subs.add(this.realm.objects("Person"));
              });
            }).to.not.throw();
          });

          it("does not throw an error if SubscriptionSet.remove is called inside a write() callback", function () {
            const { sub, subs } = addDefaultSubscription();

            expect(function () {
              subs.write(function () {
                subs.remove(sub);
              });
            }).to.not.throw();
          });

          it("does not return a promise", function () {
            const subs = this.realm.getSubscriptions();
            expect(
              subs.write(function () {
                subs.add(this.realm.objects("Person"));
              }),
            ).to.be.undefined;
          });

          it("does not wait for subscriptions to be in a ready state", function () {
            const subs = this.realm.getSubscriptions();
            subs.write(function () {
              subs.add(this.realm.objects("Person"));
            });

            expect(subs.state).to.equal(Realm.SubscriptionState.Pending);
          });

          it("handles multiple updates in a single batch", function () {
            const { subs, sub } = addDefaultSubscription();

            subs.write(function () {
              subs.removeSubscription(sub);
              subs.add(this.realm.objects("Person").filtered("age < 10"));
              subs.add(this.realm.objects("Person").filtered("age > 20"));
              subs.add(this.realm.objects("Dog").filtered("age > 30"));
            });

            // TODO how to test that this worked? - do we need index access into the SubscriptionSet?
          });
        });

        describe("#writeAsync", async function () {
          it("does not throw an error if SubscriptionSet.add is called inside a writeAsync() callback", async function () {
            const subs = this.realm.getSubscriptions();

            // TODO is this syntax correct?
            expect(
              await subs.writeAsync(function () {
                subs.add(this.realm.objects("Person"));
              }),
            ).to.not.throw();
          });

          it("does not throw an error if SubscriptionSet.remove is called inside a writeAsync() callback", async function () {
            const { sub, subs } = addDefaultSubscription();

            expect(
              await subs.writeAsync(function () {
                subs.remove(sub);
              }),
            ).to.not.throw();
          });

          it("returns a promise", function () {
            const subs = this.realm.getSubscriptions();
            expect(
              subs.writeAsync(function () {
                subs.add(this.realm.objects("Person"));
              }),
            ).to.be.instanceOf(Promise);
          });

          it("does not wait for subscriptions to be in a ready state", async function () {
            const subs = this.realm.getSubscriptions();
            await subs.writeAsync(function () {
              subs.add(this.realm.objects("Person"));
            });

            expect(subs.state).to.equal(Realm.SubscriptionState.Pending);
          });

          it("handles multiple updates in a single batch", async function () {
            const { subs, sub } = addDefaultSubscription();

            await subs.writeAsync(function () {
              subs.removeSubscription(sub);
              subs.add(this.realm.objects("Person").filtered("age < 10"));
              subs.add(this.realm.objects("Person").filtered("age > 20"));
              subs.add(this.realm.objects("Dog").filtered("age > 30"));
            });

            // TODO how to test that this worked? - do we need index access into the SubscriptionSet?
          });
        });
      });

      describe("#add", function () {
        // Behaviour is mostly tested in #find and #findByName

        it("returns a subscription object", function () {
          const { sub } = addDefaultSubscription();
          expect(sub).is.instanceOf(Realm.Subscription);
        });

        describe("updateExisting", function () {
          it("throws and does not add the subscription if a subscription with the same name but different query is added, and updateExisting is false", function () {
            const { subs } = addDefaultSubscription({ name: "test" });
            const query = this.realm.objects("Dog");

            expect(function () {
              subs.write(function () {
                subs.add(query, { name: "test", updateExisting: false });
              });
            }).to.throw("xxx");

            expect(subs.find(query)).to.be.null;
          });

          function testUpdateExistingTrue(addOptions: Realm.SubscriptionOptions = {}) {
            const { subs } = addDefaultSubscription({ name: "test" });
            const query = this.realm.objects("Dog");
            let sub;

            expect(function () {
              subs.write(function () {
                sub = subs.add(query, { name: "test", ...addOptions });
              });
            }).to.not.throw;

            expect(subs.find(query)).to.equal(sub);
          }

          it("updates the existing subscription if a subscription with the same name but different query is added, and updateExisting is true", function () {
            testUpdateExistingTrue({ updateExisting: true });
          });

          it("updates the existing subscription if a subscription with the same name but different query is added, and updateExisting is not specified", function () {
            testUpdateExistingTrue();
          });
        });
      });

      describe("#removeByName", function () {
        it("returns false and does not remove any subscriptions if the subscription is not found", function () {
          const { subs } = addDefaultSubscription();

          subs.write(function () {
            expect(subs.removeByName("test")).to.be.false;
          });
          expect(subs.empty).to.be.false;
        });

        it("returns true and removes the subscription if the subscription is found", function () {
          const { subs } = addDefaultSubscription({ name: "test" });

          subs.write(function () {
            expect(subs.removeByName("test")).to.be.true;
          });
          expect(subs.empty).to.be.true;
        });
      });

      describe("#remove", function () {
        it("returns false and does not remove any subscriptions if the subscription for the query is not found", function () {
          const query = this.realm.objects("Person");
          const query2 = this.realm.objects("Dog");

          const { subs } = addSubscription(query);

          subs.write(function () {
            expect(subs.remove(query2)).to.be.false;
          });
          expect(subs.empty).to.be.false;
        });

        it("returns true and removes the subscription for the query if it is found", function () {
          const query = this.realm.objects("Person");
          const { subs } = addSubscription(query);

          subs.write(function () {
            expect(subs.remove(query)).to.be.true;
          });
          expect(subs.empty).to.be.true;
        });
      });

      describe("#removeSubscription", function () {
        it("returns false if the subscription is not found", function () {
          const { subs, sub } = addDefaultSubscription();
          subs.write(function () {
            subs.addSubscription(this.realm.objects("Dog"));
          });
          subs.write(function () {
            subs.removeSubscription(sub);
          });

          subs.write(function () {
            expect(subs.removeSubscription(sub)).to.be.false;
          });
          expect(subs.empty).to.be.false;
        });

        it("returns true and removes the subscription if the subscription is found", function () {
          const { subs, sub } = addDefaultSubscription();

          subs.write(function () {
            expect(subs.removeSubscription(sub)).to.be.true;
          });
          expect(subs.empty).to.be.true;
        });
      });

      describe("#removeAll", function () {
        it("returns 0 if no subscriptions exist", function () {
          const subs = this.realm.getSubscriptions();

          subs.write(function () {
            expect(subs.removeAll()).to.equal(0);
          });
        });

        it("removes all subscriptions and returns the number of subscriptions removed", function () {
          const { subs } = addDefaultSubscription();
          addDefaultSubscription();

          subs.write(function () {
            expect(subs.removeAll()).to.equal(2);
            expect(subs.empty).to.be.true;
          });
        });
      });

      describe("#removeByObjectType", function () {
        it("returns 0 if no subscriptions for the object type exist", function () {
          const { subs } = addDefaultSubscription();

          subs.write(function () {
            expect(subs.removeByObjectType("Dog")).to.equal(0);
            expect(subs.empty).to.be.true;
          });
        });

        it("removes all subscriptions for the object type and returns the number of subscriptions removed", function () {
          const { subs } = addDefaultSubscription();
          addDefaultSubscription();
          addSubscription(this.realm.objects("Dog"));

          subs.write(function () {
            expect(subs.removeByObjectType("Person")).to.equal(2);
            expect(subs.empty).to.be.false;
          });
        });
      });

      describe("multi-client behaviour", function () {
        it("does not automatically update if another client updates subscriptions after we call getSubscriptions", function () {
          const subs = this.realm.getSubscriptions();
          expect(subs.empty).to.be.true;

          // TODO what is the proper way to do this?
          const otherClientRealm = new Realm({ schema: [PersonSchema], sync: { flexible: true } });
          const otherClientSubs = otherClientRealm.getSubscriptions();
          otherClientSubs.write(function () {
            otherClientSubs.add(otherClientRealm.objects("Person"));
          });

          expect(otherClientSubs.empty).to.be.false;
          expect(subs.empty).to.be.true;
        });

        it("sees another client's updated subscriptions if we call getSubscriptions after they are modified", function () {
          let subs = this.realm.getSubscriptions();
          expect(subs.empty).to.be.true;

          // TODO what is the proper way to do this?
          const otherClientRealm = new Realm({ schema: [PersonSchema], sync: { flexible: true } });
          const otherClientSubs = otherClientRealm.getSubscriptions();
          otherClientSubs.write(function () {
            otherClientSubs.add(otherClientRealm.objects("Person"));
          });

          subs = this.realm.getSubscriptions();

          expect(otherClientSubs.empty).to.be.false;
          expect(subs.empty).to.be.false;
        });
      });
    });
  });

  describe("synchronisation", function () {
    importAppBefore("with-db");
    authenticateUserBefore();
    openRealmBeforeEach({ schema: [PersonSchema], sync: { flexible: true } });

    it("syncs changes to a subscribed collection", function () {});
  });
});
