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

import { PersonSchema } from "../../schemas/person-and-dog-with-object-ids";

describe("Flexible sync", () => {
  let realm: Realm;

  beforeEach(() => {
    realm = new Realm({ schema: [PersonSchema], sync: { flexible: true } });
  });

  afterEach(() => {
    // tear down realm
  });

  describe("Realm.getSubscriptions()", () => {
    it("returns a SubscriptionSet", () => {
      expect(realm.getSubscriptions()).to.be.instanceOf(Realm.SubscriptionSet);
    });
  });

  describe("SubscriptionSet", () => {
    const addDefaultSubscription = (options?: Realm.SubscriptionOptions = undefined) => {
      return addSubscription(realm.objects("Person"), options);
    };

    const addSubscription = (query: unknown, options?: Realm.SubscriptionOptions = undefined) => {
      const subs = realm.getSubscriptions();
      let sub;

      subs.write(() => {
        sub = subs.add(query, options);
      });

      return { subs, sub };
    };

    describe("#empty", () => {
      it("returns true if no subscriptions exist", () => {
        expect(realm.getSubscriptions().empty).to.be.true;
      });

      it("returns false if subscriptions exist", () => {
        const { subs } = addDefaultSubscription();

        expect(subs.empty).to.be.false;
      });

      it("returns true if a subscription is added then removed", () => {
        const subs = realm.getSubscriptions();
        let sub;

        expect(subs.empty).to.be.true;

        subs.write(() => {
          sub = subs.add(realm.objects("Person"));
        });

        expect(subs.empty).to.be.false;

        subs.write(() => {
          subs.removeSubscription(sub);
        });

        expect(subs.empty).to.be.true;
      });
    });

    describe("#findByName", () => {
      it("returns null if the named subscription does not exist", () => {
        expect(realm.getSubscriptions().findByName("test")).to.be.null;
      });

      it("returns the named subscription", () => {
        const { subs, sub } = addDefaultSubscription({ name: "test" });

        expect(subs.findByName("test")).to.equal(sub);
      });
    });

    describe("#find", () => {
      it("returns null if the query is not subscribed to", () => {
        expect(realm.getSubscriptions().find(realm.objects("person"))).to.be.null;
      });

      it("returns a query's subscription by reference", () => {
        const query = realm.objects("Person");
        const { subs, sub } = addSubscription(query);

        expect(subs.find(query)).to.equal(sub);
      });

      it("returns a filtered query's subscription", () => {
        const query = realm.objects("Person").filtered("age > 10");
        const { subs, sub } = addSubscription(query);

        expect(subs.find(query)).to.equal(sub);
      });

      it("returns a sorted query's subscription", () => {
        const query = realm.objects("Person").sorted("age");
        const { subs, sub } = addSubscription(query);

        expect(subs.find(query)).to.equal(sub);
      });

      it("returns a filtered and sorted query's subscription", () => {
        const query = realm.objects("Person").sorted("age");
        const { subs, sub } = addSubscription(query);

        expect(subs.find(query)).to.equal(sub);
      });

      it("returns a query with equivalent RQL respresentation's subscription", () => {
        const { subs, sub } = addDefaultSubscription();

        expect(subs.find(realm.objects("Person"))).to.equal(sub);
      });

      describe("#state", () => {
        it("is Pending by default", () => {
          const subs = realm.getSubscriptions();
          expect(subs.state).to.equal(Realm.SubscriptionState.Pending);
        });

        // TOOD do we want to duplicate tests from waitForSynchronisation here?
      });

      describe("#error", () => {
        it("is null by default", () => {
          const subs = realm.getSubscriptions();
          expect(subs.error).to.be.null;
        });

        it("is null if there was no error synchronising subscriptions", async () => {
          const { subs } = addDefaultSubscription();
          await subs.waitForSynchronization();

          expect(subs.error).to.be.null;
        });

        it("is contains the error if there was an error synchronising subscriptions", async () => {
          const { subs } = addDefaultSubscription();
          // TODO simulate error
          await subs.waitForSynchronization();

          expect(subs.error).to.be.instanceOf(Error);
          // TODO check more stuff about the error
        });
      });

      describe("#waitForSynchronization", () => {
        it("waits for subscriptions to be in a ready state", async () => {
          const { subs } = addDefaultSubscription();
          expect(subs.state).to.equal(Realm.SubscriptionState.Pending);

          await subs.waitForSynchronization();

          expect(subs.state).to.equal(Realm.SubscriptionState.Ready);
        });

        it("resolves if subscriptions are already in a ready state", async () => {
          const { subs } = addDefaultSubscription();
          await subs.waitForSynchronization();
          await subs.waitForSynchronization();

          expect(subs.state).to.equal(Realm.SubscriptionState.Ready);
        });

        it("throws if there is an error synchronising subscriptions", async () => {
          const { subs } = addDefaultSubscription();
          expect(subs.state).to.equal(Realm.SubscriptionState.Pending);

          // TODO simulate error
          await subs.waitForSynchronization();

          expect(subs.state).to.equal(Realm.SubscriptionState.Error);
        });

        it("throws if another client updates subscriptions while waiting for synchronisation", () => {
          // TODO what is the proper way to do this?
          const otherClientRealm = new Realm({ schema: [PersonSchema], sync: { flexible: true } });

          const { subs } = addDefaultSubscription();

          const otherClientSubs = otherClientRealm.getSubscriptions();

          expect(
            Promise.all([
              otherClientSubs.write(() => {
                otherClientSubs.add(realm.objects("Person"));
              }),
              subs.waitForSynchronization(),
            ]),
          ).throws("xxx");
          expect(subs.state).to.equal(Realm.SubscriptionState.Error);
        });
      });

      describe("#write/#writeAsync", () => {
        it("throws an error if SubscriptionSet.add is called outside of a write/writeAsync() callback", () => {
          const subs = realm.getSubscriptions();

          expect(() => {
            subs.add(realm.objects("Person"));
          }).throws("Cannot modify subscriptions outside of a SubscriptionSet.write transaction.");
        });

        it("throws an error if SubscriptionSet.remvove is called outside of a write/writeAsync() callback", () => {
          const { subs, sub } = addDefaultSubscription();

          expect(() => {
            subs.remove(sub);
          }).throws("Cannot modify subscriptions outside of a SubscriptionSet.write transaction.");
        });

        describe("#write", () => {
          it("does not throw an error if SubscriptionSet.add is called inside a write() callback", () => {
            const subs = realm.getSubscriptions();

            expect(() => {
              subs.write(() => {
                subs.add(realm.objects("Person"));
              });
            }).to.not.throw();
          });

          it("does not throw an error if SubscriptionSet.remove is called inside a write() callback", () => {
            const { sub, subs } = addDefaultSubscription();

            expect(() => {
              subs.write(() => {
                subs.remove(sub);
              });
            }).to.not.throw();
          });

          it("does not return a promise", () => {
            const subs = realm.getSubscriptions();
            expect(
              subs.write(() => {
                subs.add(realm.objects("Person"));
              }),
            ).to.be.undefined;
          });

          it("does not wait for subscriptions to be in a ready state", () => {
            const subs = realm.getSubscriptions();
            subs.write(() => {
              subs.add(realm.objects("Person"));
            });

            expect(subs.state).to.equal(Realm.SubscriptionState.Pending);
          });
        });

        describe("#writeAsync", () => {
          it("does not throw an error if SubscriptionSet.add is called inside a writeAsync() callback", async () => {
            const subs = realm.getSubscriptions();

            // TODO is this syntax correct?
            expect(
              await subs.writeAsync(() => {
                subs.add(realm.objects("Person"));
              }),
            ).to.not.throw();
          });

          it("does not throw an error if SubscriptionSet.remove is called inside a writeAsync() callback", async () => {
            const { sub, subs } = addDefaultSubscription();

            expect(
              await subs.writeAsync(() => {
                subs.remove(sub);
              }),
            ).to.not.throw();
          });

          it("returns a promise", () => {
            const subs = realm.getSubscriptions();
            expect(
              subs.writeAsync(() => {
                subs.add(realm.objects("Person"));
              }),
            ).to.be.instanceOf(Promise);
          });

          it("does not wait for subscriptions to be in a ready state", async () => {
            const subs = realm.getSubscriptions();
            await subs.writeAsync(() => {
              subs.add(realm.objects("Person"));
            });

            expect(subs.state).to.equal(Realm.SubscriptionState.Pending);
          });
        });
      });

      describe("#add", () => {
        // Behaviour is tested in #find and #findByName

        it("returns a subscription object", () => {
          const { sub } = addDefaultSubscription();
          expect(sub).is.instanceOf(Realm.Subscription);
        });
      });

      describe("#removeByName", () => {
        it("returns false and does not remove any subscriptions if the subscription is not found", () => {
          const { subs } = addDefaultSubscription();

          subs.write(() => {
            expect(subs.removeByName("test")).to.be.false;
          });
          expect(subs.empty).to.be.false;
        });

        it("returns true and removes the subscription if the subscription is found", () => {
          const { subs } = addDefaultSubscription({ name: "test" });

          subs.write(() => {
            expect(subs.removeByName("test")).to.be.true;
          });
          expect(subs.empty).to.be.true;
        });
      });

      describe("#remove", () => {
        it("returns false and does not remove any subscriptions if the subscription for the query is not found", () => {
          const query = realm.objects("Person");
          const query2 = realm.objects("Dog");

          const { subs } = addSubscription(query);

          subs.write(() => {
            expect(subs.remove(query2)).to.be.false;
          });
          expect(subs.empty).to.be.false;
        });

        it("returns true and removes the subscription for the query if it is found", () => {
          const query = realm.objects("Person");
          const { subs } = addSubscription(query);

          subs.write(() => {
            expect(subs.remove(query)).to.be.true;
          });
          expect(subs.empty).to.be.true;
        });
      });

      describe("#removeSubscription", () => {
        it("returns false if the subscription is not found", () => {
          const { subs, sub } = addDefaultSubscription();
          subs.write(() => {
            subs.addSubscription(realm.objects("Dog"));
          });
          subs.write(() => {
            subs.removeSubscription(sub);
          });

          subs.write(() => {
            expect(subs.removeSubscription(sub)).to.be.false;
          });
          expect(subs.empty).to.be.false;
        });

        it("returns true and removes the subscription if the subscription is found", () => {
          const { subs, sub } = addDefaultSubscription();

          subs.write(() => {
            expect(subs.removeSubscription(sub)).to.be.true;
          });
          expect(subs.empty).to.be.true;
        });
      });

      describe("#removeAll", () => {
        it("returns 0 if no subscriptions exist", () => {
          const subs = realm.getSubscriptions();
          expect(subs.removeAll()).to.equal(0);
        });

        it("removes all subscriptions and returns the number of subscriptions removed", () => {
          const { subs } = addDefaultSubscription();
          addDefaultSubscription();

          expect(subs.removeAll()).to.equal(2);
          expect(subs.empty).to.be.true;
        });
      });

      describe("#removeByObjectType", () => {
        it("returns 0 if no subscriptions for the object type exist", () => {
          const { subs } = addDefaultSubscription();
          expect(subs.removeByObjectType("Dog")).to.equal(0);
          expect(subs.empty).to.be.true;
        });

        it("removes all subscriptions for the object type and returns the number of subscriptions removed", () => {
          const { subs } = addDefaultSubscription();
          addDefaultSubscription();
          addSubscription(realm.objects("Dog"));

          expect(subs.removeByObjectType("Person")).to.equal(2);
          expect(subs.empty).to.be.false;
        });
      });

      describe("multi-client behaviour", () => {
        it("does not automatically update if another client updates subscriptions after we call getSubscriptions", () => {
          const subs = realm.getSubscriptions();
          expect(subs.empty).to.be.true;

          // TODO what is the proper way to do this?
          const otherClientRealm = new Realm({ schema: [PersonSchema], sync: { flexible: true } });
          const otherClientSubs = otherClientRealm.getSubscriptions();
          otherClientSubs.write(() => {
            otherClientSubs.add(otherClientRealm.objects("Person"));
          });

          expect(otherClientSubs.empty).to.be.false;
          expect(subs.empty).to.be.true;
        });

        it("sees another client's updated subscriptions if we call getSubscriptions after they are modified", () => {
          let subs = realm.getSubscriptions();
          expect(subs.empty).to.be.true;

          // TODO what is the proper way to do this?
          const otherClientRealm = new Realm({ schema: [PersonSchema], sync: { flexible: true } });
          const otherClientSubs = otherClientRealm.getSubscriptions();
          otherClientSubs.write(() => {
            otherClientSubs.add(otherClientRealm.objects("Person"));
          });

          subs = realm.getSubscriptions();

          expect(otherClientSubs.empty).to.be.false;
          expect(subs.empty).to.be.false;
        });
      });
    });

    describe("batching multiple updates", () => {
      // TODO
    });
  });

  describe("synchronisation", () => {});
});
