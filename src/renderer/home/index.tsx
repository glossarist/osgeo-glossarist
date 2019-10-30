import { debounce } from 'throttle-debounce';
import { ipcRenderer } from 'electron';

import React, { useState, useEffect, useContext } from 'react';

import { NonIdealState, Icon, InputGroup } from '@blueprintjs/core';

import { LangConfigContext } from 'sse/localizer/renderer';
import { PaneHeader } from 'sse/renderer/widgets/pane-header';
import { apiRequest } from 'sse/api/renderer';
import { Concept } from 'models/concept';

import styles from './styles.scss';


export const Home: React.FC<{}> = function () {
  const [concepts, updateConcepts] = useState([] as Concept[]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState(undefined as undefined | string);

  async function reloadConcepts() {
    setLoading(true);
    const concepts = await apiRequest<Concept[]>(
      'search-concepts',
      JSON.stringify({ query: query }));
    setLoading(false);
    updateConcepts(concepts);
  }

  const reloadThrottled = debounce(500, reloadConcepts);

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

  return (
    <div className={styles.homeBase}>
      <PaneHeader align="right">OSGeo Concepts</PaneHeader>

      <div className={styles.searchControls}>
        <InputGroup
          placeholder="Search"
          value={query || ''}
          type="text"
          className={loading ? styles.queryLoading : undefined}
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

      <div className={styles.conceptCollection}>
        {concepts.length > 0
          ? concepts.map((concept) => (
              <ConceptItem concept={concept} />
            ))
          : <NonIdealState
              title="Nothing to display"
              icon="zoom-out" />}
      </div>
    </div>
  );
};


const ConceptItem: React.FC<{ concept: Concept }> = function ({ concept }) {
  const lang = useContext(LangConfigContext);
  const localized = concept[lang.selected];

  const hasComments = (localized.comments || []).length > 0;
  const hasNotes = (localized.notes || []).length > 0;

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
      </div>
    </li>
  );
};
