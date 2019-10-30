import { throttle } from 'throttle-debounce';
import { ipcRenderer } from 'electron';

import React, { useState, useEffect, useContext } from 'react';

import { NonIdealState, Button, Spinner, Icon, InputGroup } from '@blueprintjs/core';

import { LangConfigContext } from 'sse/localizer/renderer';
import { PaneHeader } from 'sse/renderer/widgets/pane-header';
import { apiRequest } from 'sse/api/renderer';
import { Concept } from 'models/concept';

import styles from './styles.scss';


export const Home: React.FC<{}> = function () {
  const [concepts, updateConcepts] = useState([] as Concept[]);
  const [total, updateTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [canMerge, setCanMerge] = useState(false);
  const [query, setQuery] = useState(undefined as undefined | string);

  async function reloadConcepts() {
    setLoading(true);
    const result = await apiRequest<{ items: Concept[], total: number }>(
      'search-concepts',
      JSON.stringify({ query: query }));
    setLoading(false);
    updateConcepts(result.items);
    updateTotal(result.total);
    setCanMerge(true);
  }

  const reloadThrottled = throttle(500, reloadConcepts);

  useEffect(() => {
    reloadConcepts();
    ipcRenderer.once('app-loaded', reloadConcepts);
    return function cleanup() {
      ipcRenderer.removeListener('app-loaded', reloadConcepts);
    };
  }, []);

  useEffect(() => {
    reloadThrottled();
  }, [query]);

  const maybeSpinner = loading ? <Spinner size={Icon.SIZE_STANDARD} /> : undefined;

  return (
    <div className={styles.homeBase}>
      <PaneHeader align="right">OSGeo Concepts</PaneHeader>

      <div className={styles.searchControls}>
        <InputGroup
          placeholder="Type to search…"
          large={true}
          rightElement={maybeSpinner}
          value={query || ''}
          type="text"
          onChange={(evt: React.FormEvent<HTMLElement>) => {
            const newQuery = (evt.target as HTMLInputElement).value as string;
            if (newQuery.trim() !== '') {
              setQuery(newQuery);
            } else {
              setQuery(undefined);
            }
          }}
        />
      </div>

      <main className={styles.conceptCollection}>
        {concepts.length > 0
          ? <>
              {concepts.map((concept) => (
                <ConceptItem concept={concept} />
              ))}
              <div className={styles.conceptCollectionTotal}>
                <p>Showing {concepts.length} out of {total} result(s) found</p>
              </div>
            </>
          : <NonIdealState
              title="Nothing to display"
              icon="zoom-out" />}
      </main>

      <footer className={styles.actions}>
        <Button
          disabled={!canMerge}
          large={true}
          intent="success"
          fill={true}
          onClick={() => ipcRenderer.sendSync('open-data-synchronizer')}
          icon="git-merge">Merge changes</Button>
      </footer>
    </div>
  );
};


const ConceptItem: React.FC<{ concept: Concept }> = function ({ concept }) {
  const lang = useContext(LangConfigContext);
  const localized = concept[lang.selected];

  const hasComments = (localized.comments || []).length > 0;
  const hasNotes = (localized.notes || []).length > 0;
  const hasExamples = (localized.examples || []).length > 0;

  return (
    <li className={styles.conceptItem} onClick={() => ipcRenderer.sendSync('open-concept', `${concept.id}`)}>
      <p className={styles.title}>
        <a>{localized.term}</a>
      </p>
      <div className={styles.icons}>
        <Icon icon="comment"
          htmlTitle="Has comments"
          className={hasComments ? styles.activeIcon : undefined}
          intent={hasComments ? "primary" : undefined} />
        <Icon icon="annotation"
          htmlTitle="Has notes"
          className={hasNotes ? styles.activeIcon : undefined}
          intent={hasNotes ? "primary" : undefined} />
        <Icon icon="citation"
          htmlTitle="Has examples"
          className={hasExamples ? styles.activeIcon : undefined}
          intent={hasExamples ? "primary" : undefined} />
      </div>
    </li>
  );
};
