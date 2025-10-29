import governmentData from '../data/government.json';

type GovernmentDataset = {
  meta: {
    title: string;
    description: string;
  };
  nodes: Array<{
    id: string;
    label: string;
    branch: string;
    description?: string;
    processes?: string[];
  }>;
  edges: Array<{
    id?: string;
    source: string;
    target: string;
    process?: string;
    description?: string;
  }>;
};

const dataset = governmentData as GovernmentDataset;

function App() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="border-b border-slate-200 bg-slate-50 px-6 py-5">
        <h1 className="text-2xl font-semibold text-slate-900">
          {dataset.meta.title}
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-600">
          {dataset.meta.description}
        </p>
      </header>

      <main className="flex flex-1 flex-col gap-6 p-6 lg:flex-row">
        <section className="flex w-full flex-1 flex-col gap-4">
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50/80 p-6 text-center text-sm text-slate-500">
            Cytoscape visualization mounts here in Phase 1. The container is
            ready for zoom, pan, and process highlighting.
          </div>
        </section>

        <aside className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-medium text-slate-900">
            Dataset Snapshot
          </h2>
          <dl className="mt-4 space-y-2 text-sm text-slate-600">
            <div className="flex justify-between">
              <dt>Total civic entities</dt>
              <dd className="font-semibold text-slate-900">
                {dataset.nodes.length}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt>Relationships mapped</dt>
              <dd className="font-semibold text-slate-900">
                {dataset.edges.length}
              </dd>
            </div>
          </dl>
          <div className="mt-6 space-y-2">
            <h3 className="text-sm font-semibold text-slate-900">
              Core processes
            </h3>
            <ul className="space-y-2 text-sm text-slate-600">
              <li className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-legislative" />
                Legislative flow
              </li>
              <li className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-budget" />
                Budget cycle
              </li>
              <li className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-ulurp" />
                ULURP review
              </li>
            </ul>
          </div>
        </aside>
      </main>
    </div>
  );
}

export default App;
