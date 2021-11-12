// A mutable collection of subscriptions. Mutating it can
// only happen in a update/updateAsync callback.
interface Subscriptions {
  // Returns true if there are no subscriptions in the set
  //  readonly empty: boolean;

  // Get a read-only snapshot of the subscriptions in the array
  // getSubscriptions(): ReadonlyArray<Subscription>;

  // Find a subscription by name. Return null if not found.
  // findByName<T>(name: string): Subscription<T> | null;

  // Find a subscription by query. Return null if not found.
  // Will match both named and unnamed subscriptions.
  // find<T>(query: Realm.Results<T & Realm.Object>): Subscription<T> | null;

  // The state of this collection - is it acknowledged by the server and
  // has the data been downloaded locally?
  readonly state: SubscriptionState;

  // The exception containing information for why the state of the SubscriptionSet
  // is set to Error. If the state is not set to Error, this will be null.
  readonly error: Realm.SyncError | null;

  // Wait for the server to acknowledge and send all the data associated
  // with this collection of subscriptions. If the State is Complete, this method
  // will return immediately. If the State is Error, this will throw an error
  // immediately. If someone updates the Realm subscriptions while waiting,
  // this will throw a specific error.
  waitForSynchronization: () => Promise<void>;

  // Creates a transaction and updates this subscription set.
  // update: (callback: (mutableSubs) => void) => void;

  // Asynchronously creates and commits a transaction to update
  // the subscription set. Doesn't call waitForSynchronization.
  // Not doing? updateAsync: (callback: () => void) => Promise<void>;

  // Add a query to the list of subscriptions. Optionally, provide a name
  // and other parameters.
  // add: <T>(query: Realm.Results<T & Realm.Object>, options: SubscriptionOptions | undefined) => Subscription<T>;

  // Remove a subscription by name. Returns false if not found.
  // removeByName: (name: string) => boolean;

  // Remove a subscription by query. Returns false if not found.
  // remove: <T>(query: Realm.Results<T & Realm.Object>) => boolean;

  // Remove a concrete subscription. Returns false if not found.
  removeSubscription: <T>(subscription: Subscription<T>) => boolean;

  // Remove all subscriptions. Returns number of removed subscriptions.
  // removeAll: () => number;

  // Remove all subscriptions for object type. Returns number of removed subscriptions.
  removeByObjectType: (objectType: string) => number;
}
