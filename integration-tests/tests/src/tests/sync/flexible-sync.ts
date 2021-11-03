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
    realm = new Realm({ schema: [PersonSchema] });
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
    describe("empty", () => {
      it("returns true if no subscriptions exist", () => {
        expect(realm.getSubscriptions().empty).to.be.true;
      });

      it("returns false if subscriptions exist", () => {
        const subs = realm.getSubscriptions();
        subs.write(() => {
          subs.add(realm.objects("Person"));
        });

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

    describe("findByName", () => {
      it("returns null if the named subscription does not exist", () => {
        expect(realm.getSubscriptions().findByName("test")).to.be.null;
      });

      it("returns the named subscription", () => {
        const subs = realm.getSubscriptions();
        let sub;

        subs.write(() => {
          sub = subs.add(realm.objects("Person"), { name: "test" });
        });

        expect(subs.findByName("test")).to.equal(sub);
      });
    });
  });

  describe("find", () => {
    it("returns null if the query is not subscribed to", () => {
      expect(realm.getSubscriptions().find(realm.objects("person"))).to.be.null;
    });

    it("returns a query's subscription by reference", () => {
      const subs = realm.getSubscriptions();
      const query = realm.objects("Person");
      let sub;

      subs.write(() => {
        sub = subs.add(query);
      });

      expect(subs.find(query)).to.equal(sub);
    });

    it("returns a filtered query's subscription", () => {
      const subs = realm.getSubscriptions();
      const query = realm.objects("Person").filtered("age > 10");
      let sub;

      subs.write(() => {
        sub = subs.add(query);
      });

      expect(subs.find(query)).to.equal(sub);
    });

    it("returns a sorted query's subscription", () => {
      const subs = realm.getSubscriptions();
      const query = realm.objects("Person").sorted("age");
      let sub;

      subs.write(() => {
        sub = subs.add(query);
      });

      expect(subs.find(query)).to.equal(sub);
    });

    it("returns a filtered and sorted query's subscription", () => {
      const subs = realm.getSubscriptions();
      const query = realm.objects("Person").sorted("age");
      let sub;

      subs.write(() => {
        sub = subs.add(query);
      });

      expect(subs.find(query)).to.equal(sub);
    });

    it("returns a query with equivalent RQL respresentation's subscription", () => {
      const subs = realm.getSubscriptions();
      let sub;

      subs.write(() => {
        sub = subs.add(realm.objects("Person"));
      });

      expect(subs.find(realm.objects("Person"))).to.equal(sub);
    });

    describe("state", () => {
      it("is Pending by default", () => {
        const subs = realm.getSubscriptions();
        expect(subs.state).to.equal(Realm.SubscriptionState.Pending);
      });

      // TOOD do we want to duplicate tests from waitForSynchronisation here?
    });

    describe("error", () => {
      it("is null by default", () => {
        const subs = realm.getSubscriptions();
        expect(subs.error).to.be.null;
      });

      it("is null if there was no error synchronising subscriptions", async () => {
        const subs = realm.getSubscriptions();
        subs.write(() => {
          subs.add(realm.objects("Person"));
        });
        await subs.waitForSynchronization();

        expect(subs.error).to.be.null;
      });

      it("is contains the error if there was an error synchronising subscriptions", async () => {
        const subs = realm.getSubscriptions();
        subs.write(() => {
          subs.add(realm.objects("Person"));
        });
        // TODO simulate error
        await subs.waitForSynchronization();

        expect(subs.error).to.be.instanceOf(Error);
        // TODO check more stuff about the error
      });
    });

    // todo check that when someone else updates subs it does not change

    describe("waitForSynchronization", () => {
      it("waits for subscriptions to be in a ready state", async () => {
        const subs = realm.getSubscriptions();
        subs.write(() => {
          subs.add(realm.objects("Person"));
        });
        expect(subs.state).to.equal(Realm.SubscriptionState.Pending);

        await subs.waitForSynchronization();

        expect(subs.state).to.equal(Realm.SubscriptionState.Ready);
      });

      it("resolves if subscriptions are already in a ready state", async () => {
        const subs = realm.getSubscriptions();
        subs.write(() => {
          subs.add(realm.objects("Person"));
        });
        await subs.waitForSynchronization();
        await subs.waitForSynchronization();

        expect(subs.state).to.equal(Realm.SubscriptionState.Ready);
      });

      it("throws if there is an error synchronising subscriptions", () => {
        const subs = realm.getSubscriptions();
        subs.write(() => {
          subs.add(realm.objects("Person"));
        });
        expect(subs.state).to.equal(Realm.SubscriptionState.Pending);

        // TODO simulate error

        expect(subs.state).to.equal(Realm.SubscriptionState.Error);
      });

      it("throws if another client updates subscriptions while waiting for syncronisation", () => {
        // TODO
      });
    });

    describe("write/writeAsync", () => {
      it("throws an error if SubscriptionSet.add is called outside of a write/writeAsync() callback", () => {
        const subs = realm.getSubscriptions();

        expect(() => {
          subs.add(realm.objects("Person"));
        }).throws("Cannot modify subscriptions outside of a SubscriptionSet.write transaction.");
      });

      it("throws an error if SubscriptionSet.remvove is called outside of a write/writeAsync() callback", () => {
        const subs = realm.getSubscriptions();
        let sub;
        subs.write(() => {
          sub = subs.add(realm.objects("Person"));
        });

        expect(() => {
          subs.remove(sub);
        }).throws("Cannot modify subscriptions outside of a SubscriptionSet.write transaction.");
      });

      describe("write", () => {
        it("does not throw an error if SubscriptionSet.add is called inside a write() callback", () => {
          const subs = realm.getSubscriptions();

          expect(() => {
            subs.write(() => {
              subs.add(realm.objects("Person"));
            });
          }).to.not.throw();
        });

        it("does not throw an error if SubscriptionSet.remove is called inside a write() callback", () => {
          const subs = realm.getSubscriptions();
          let sub;
          subs.write(() => {
            sub = subs.add(realm.objects("Person"));
          });

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

      describe("writeAsync", () => {
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
          const subs = realm.getSubscriptions();
          let sub;
          subs.write(() => {
            sub = subs.add(realm.objects("Person"));
          });

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
  });
});
