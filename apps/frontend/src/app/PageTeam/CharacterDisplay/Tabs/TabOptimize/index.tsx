import {
  useBoolState,
  useForceUpdate,
} from '@genshin-optimizer/common/react-util'
import {
  BootstrapTooltip,
  CardThemed,
  DropdownButton,
  ModalWrapper,
} from '@genshin-optimizer/common/ui'
import {
  notEmpty,
  objKeyMap,
  objPathValue,
  range,
} from '@genshin-optimizer/common/util'
import type { CharacterKey } from '@genshin-optimizer/gi/consts'
import {
  allArtifactSlotKeys,
  charKeyToLocCharKey,
} from '@genshin-optimizer/gi/consts'
import type { GeneratedBuild, ICachedArtifact } from '@genshin-optimizer/gi/db'
import { defThreads, maxBuildsToShowList } from '@genshin-optimizer/gi/db'
import {
  useDBMeta,
  useDatabase,
  useOptConfig,
} from '@genshin-optimizer/gi/db-ui'
import { getCharData } from '@genshin-optimizer/gi/stats'
import {
  Close,
  DeleteForever,
  ExpandMore,
  Science,
  TrendingUp,
} from '@mui/icons-material'
import CheckroomIcon from '@mui/icons-material/Checkroom'
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive'
import NotificationsOffIcon from '@mui/icons-material/NotificationsOff'
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  ButtonGroup,
  CardContent,
  CardHeader,
  Divider,
  Grid,
  MenuItem,
  Skeleton,
  TextField,
  Typography,
} from '@mui/material'
import React, {
  Suspense,
  useCallback,
  useContext,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { CharacterCardEquipmentRow } from '../../../../Components/Character/CharacterCard/CharacterCardEquipmentRow'
import {
  CharacterCardHeader,
  CharacterCardHeaderContent,
} from '../../../../Components/Character/CharacterCard/CharacterCardHeader'
import { CharacterCardStats } from '../../../../Components/Character/CharacterCard/CharacterCardStats'
import CloseButton from '../../../../Components/CloseButton'
import {
  HitModeToggle,
  ReactionToggle,
} from '../../../../Components/HitModeEditor'
import InfoTooltip from '../../../../Components/InfoTooltip'
import NoArtWarning from '../../../../Components/NoArtWarning'
import { CharacterContext } from '../../../../Context/CharacterContext'
import { DataContext } from '../../../../Context/DataContext'
import { GraphContext } from '../../../../Context/GraphContext'
import { OptimizationTargetContext } from '../../../../Context/OptimizationTargetContext'
import { TeamCharacterContext } from '../../../../Context/TeamCharacterContext'
import { mergeData, uiDataForTeam } from '../../../../Formula/api'
import { optimize } from '../../../../Formula/optimization'
import type { NumNode } from '../../../../Formula/type'
import type { UIData } from '../../../../Formula/uiData'
import useGlobalError from '../../../../ReactHooks/useGlobalError'
import useTeamData, { getTeamData } from '../../../../ReactHooks/useTeamData'
import type { OptProblemInput } from '../../../../Solver'
import { GOSolver } from '../../../../Solver/GOSolver/GOSolver'
import { mergeBuilds, mergePlot } from '../../../../Solver/common'
import useOldData from '../../../useOldData'
import CompareBtn from '../../CompareBtn'
import ArtifactConditionalConfig from './Components/ArtifactConditionalConfig'
import ArtifactFilters from './Components/ArtifactFilters/ArtifactFilters'
import StatFilterCard from './Components/ArtifactFilters/StatFilterCard'
import BonusStatsCard from './Components/BonusStatsCard'
import type { BuildStatus } from './Components/BuildAlert'
import BuildAlert from './Components/BuildAlert'
import BuildDisplayItem from './Components/BuildDisplayItem'
import ChartCard from './Components/ChartCard'
import OptimizationTargetSelector from './Components/OptimizationTargetSelector'
import { compactArtifacts, dynamicData } from './foreground'

const audio = new Audio('assets/notification.mp3')
export default function TabBuild() {
  const { t } = useTranslation('page_character_optimize')
  const {
    teamCharId,
    teamChar: { optConfigId, key: characterKey },
    teamId,
    team,
  } = useContext(TeamCharacterContext)
  const { characterSheet } = useContext(CharacterContext)
  const database = useDatabase()
  const { setChartData, graphBuilds, setGraphBuilds } = useContext(GraphContext)
  const { gender } = useDBMeta()

  const activeCharKey = database.teams.getActiveTeamChar(teamId)!.key

  const [notification, setnotification] = useState(false)
  const notificationRef = useRef(false)
  useEffect(() => {
    notificationRef.current = notification
  }, [notification])

  const [buildStatus, setBuildStatus] = useState({
    type: 'inactive',
    tested: 0,
    failed: 0,
    skipped: 0,
    total: 0,
  } as BuildStatus)
  const generatingBuilds = buildStatus.type !== 'inactive'

  const [artsDirty, setArtsDirty] = useForceUpdate()

  const [{ threads = defThreads }, setDisplayOptimize] = useState(
    database.displayOptimize.get()
  )
  useEffect(
    () => database.displayOptimize.follow((_r, to) => setDisplayOptimize(to)),
    [database, setDisplayOptimize]
  )

  const maxWorkers = threads > defThreads ? defThreads : threads
  const setMaxWorkers = useCallback(
    (threads: number) => database.displayOptimize.set({ threads }),
    [database]
  )

  // Clear state when changing characters
  useEffect(() => {
    setBuildStatus({
      type: 'inactive',
      tested: 0,
      failed: 0,
      skipped: 0,
      total: 0,
    })
  }, [characterKey])

  const noArtifact = useMemo(() => !database.arts.values.length, [database])

  const buildSetting = useOptConfig(optConfigId)!
  const {
    plotBase,
    optimizationTarget,
    mainStatAssumptionLevel,
    maxBuildsToShow,
    builds,
    buildDate,
  } = buildSetting
  const { data } = useContext(DataContext)
  const oldData = useOldData()
  const optimizationTargetNode =
    optimizationTarget && objPathValue(data?.getDisplay(), optimizationTarget)

  //register changes in artifact database
  useEffect(
    () => database.arts.followAny(setArtsDirty),
    [setArtsDirty, database]
  )

  const deferredArtsDirty = useDeferredValue(artsDirty)
  const deferredBuildSetting = useDeferredValue(buildSetting)
  const filteredArts = useMemo(() => {
    const {
      mainStatKeys,
      excludedLocations,
      artExclusion,
      levelLow,
      levelHigh,
      allowLocationsState,
      useExcludedArts,
      useTeammateBuild,
    } = deferredArtsDirty && deferredBuildSetting

    const artifactIds = Array.from(
      new Set(
        team.teamCharIds
          .filter(notEmpty)
          .filter((tcId) => tcId !== teamCharId)
          .map((tcId) => database.teamChars.getLoadoutArtifacts(tcId))
          .flatMap((arts) => Object.values(arts))
          .filter(notEmpty)
          .map(({ id }) => id)
      )
    )

    return database.arts.values.filter((art) => {
      if (!useExcludedArts && artExclusion.includes(art.id)) return false
      if (!useTeammateBuild && artifactIds.includes(art.id)) return false
      if (art.level < levelLow) return false
      if (art.level > levelHigh) return false
      const mainStats = mainStatKeys[art.slotKey]
      if (mainStats?.length && !mainStats.includes(art.mainStatKey))
        return false

      const locKey = charKeyToLocCharKey(characterKey)
      const unequippedStateAndEquippedElsewhere =
        allowLocationsState === 'unequippedOnly' &&
        art.location &&
        art.location !== locKey
      const customListStateAndNotOnList =
        allowLocationsState === 'customList' &&
        art.location &&
        art.location !== locKey &&
        excludedLocations.includes(art.location)
      if (unequippedStateAndEquippedElsewhere || customListStateAndNotOnList)
        return false

      return true
    })
  }, [
    characterKey,
    database.arts.values,
    database.teamChars,
    deferredArtsDirty,
    deferredBuildSetting,
    team.teamCharIds,
    teamCharId,
  ])

  const tabFocused = useRef(true)
  useEffect(() => {
    const onFocus = () => (tabFocused.current = true)
    const onBlur = () => (tabFocused.current = false)
    window.addEventListener('focus', onFocus)
    window.addEventListener('blur', onBlur)
    return () => {
      window.removeEventListener('focus', onFocus)
      window.removeEventListener('blur', onBlur)
    }
  }, [tabFocused])

  // Provides a function to cancel the work
  const cancelToken = useRef(() => {})
  //terminate worker when component unmounts
  useEffect(() => () => cancelToken.current(), [])
  const throwGlobalError = useGlobalError()

  const generateBuilds = useCallback(async () => {
    const {
      artSetExclusion,
      plotBase,
      statFilters,
      optimizationTarget,
      mainStatAssumptionLevel,
      allowPartial,
      maxBuildsToShow,
    } = buildSetting
    if (!characterKey || !optimizationTarget) return

    const split = compactArtifacts(
      filteredArts,
      mainStatAssumptionLevel,
      allowPartial
    )

    const teamData = getTeamData(
      database,
      teamId,
      teamCharId,
      mainStatAssumptionLevel,
      []
    )
    if (!teamData) return
    const workerData = uiDataForTeam(teamData.teamData, gender, activeCharKey)[
      characterKey
    ]?.target.data![0]
    if (!workerData) return
    Object.assign(workerData, mergeData([workerData, dynamicData])) // Mark art fields as dynamic
    const unoptimizedOptimizationTargetNode = objPathValue(
      workerData.display ?? {},
      optimizationTarget
    ) as NumNode | undefined
    if (!unoptimizedOptimizationTargetNode) return
    const targetNode = unoptimizedOptimizationTargetNode
    const valueFilter: { value: NumNode; minimum: number }[] = Object.entries(
      statFilters
    )
      .flatMap(([pathStr, settings]) =>
        settings
          .filter((setting) => !setting.disabled)
          .map((setting) => {
            const filterNode: NumNode = objPathValue(
              workerData.display ?? {},
              JSON.parse(pathStr)
            )
            const minimum =
              filterNode.info?.unit === '%'
                ? setting.value / 100
                : setting.value // TODO: Conversion
            return { value: filterNode, minimum: minimum }
          })
      )
      .filter((x) => x.value && x.minimum > -Infinity)

    setChartData(undefined)

    const cancelled = new Promise<void>((r) => (cancelToken.current = r))

    const unoptimizedNodes = [
      ...valueFilter.map((x) => x.value),
      unoptimizedOptimizationTargetNode,
    ]
    const minimum = [...valueFilter.map((x) => x.minimum), -Infinity]
    const plotBaseNumNode: NumNode =
      plotBase && objPathValue(workerData.display ?? {}, plotBase)
    if (plotBaseNumNode) {
      unoptimizedNodes.push(plotBaseNumNode)
      minimum.push(-Infinity)
    }

    const nodes = optimize(
      unoptimizedNodes,
      workerData,
      ({ path: [p] }) => p !== 'dyn'
    )
    const plotBaseNode = plotBaseNumNode ? nodes.pop() : undefined
    const optimizationTargetNode = nodes.pop()!

    const problem: OptProblemInput = {
      arts: split,
      optimizationTarget: optimizationTargetNode,
      exclusion: artSetExclusion,
      constraints: nodes.map((value, i) => ({ value, min: minimum[i] })),

      topN: maxBuildsToShow,
      plotBase: plotBaseNode,
    }
    const status: Omit<BuildStatus, 'type'> = {
      tested: 0,
      failed: 0,
      skipped: 0,
      total: 0,
      startTime: performance.now(),
    }
    const statusUpdateTimer = setInterval(
      () => setBuildStatus({ type: 'active', ...status }),
      100
    )

    const cancellationError = new Error()
    try {
      const solver = new GOSolver(problem, status, maxWorkers)
      cancelled.then(() => solver.cancel(cancellationError))

      const results = await solver.solve()
      solver.cancel() // Done using `solver`

      cancelToken.current = () => {}
      const weaponId = database.teamChars.getLoadoutWeapon(teamCharId).id
      if (plotBaseNumNode) {
        const plotData = mergePlot(results.map((x) => x.plotData!))
        const solverBuilds = Object.values(plotData)
        if (targetNode.info?.unit === '%')
          solverBuilds.forEach(
            (dataEntry) => (dataEntry.value = dataEntry.value * 100)
          )
        if (plotBaseNumNode.info?.unit === '%')
          solverBuilds.forEach(
            (dataEntry) => (dataEntry.plot = (dataEntry.plot ?? 0) * 100)
          )
        setChartData({
          valueNode: targetNode,
          plotNode: plotBaseNumNode,
          data: solverBuilds.map(({ value, plot, artifactIds }) => ({
            artifactIds: objKeyMap(allArtifactSlotKeys, (slotKey) =>
              artifactIds.find(
                (aId) => database.arts.get(aId)?.slotKey === slotKey
              )
            ),
            weaponId,
            value,
            plot,
          })),
        })
      }
      const builds = mergeBuilds(
        results.map((x) => x.builds),
        maxBuildsToShow
      )
      if (process.env.NODE_ENV === 'development')
        console.log('Build Result', builds)

      database.optConfigs.set(optConfigId, {
        builds: builds.map((build) => ({
          artifactIds: objKeyMap(allArtifactSlotKeys, (slotKey) =>
            build.artifactIds.find(
              (aId) => database.arts.get(aId)?.slotKey === slotKey
            )
          ),
          weaponId,
        })),
        buildDate: Date.now(),
      })

      setTimeout(() => {
        // Using a ref because a user can cancel the notification while the build is going.
        if (results && notificationRef.current) {
          audio.play()
          if (!tabFocused.current)
            setTimeout(() => window.alert(t`buildCompleted`), 1)
        }
      }, 100)
    } catch (e) {
      // Worker error, cancelled, printer catches on fire, etc.
      if (e !== cancellationError) {
        console.log('Failed to load worker')
        console.log(e)
        if (e instanceof Error) throwGlobalError(e)
      }

      cancelToken.current()
      status.tested = 0
      status.failed = 0
      status.skipped = 0
      status.total = 0
    } finally {
      clearInterval(statusUpdateTimer)
      setBuildStatus({
        type: 'inactive',
        ...status,
        finishTime: performance.now(),
      })
    }
  }, [
    buildSetting,
    characterKey,
    filteredArts,
    database,
    teamId,
    teamCharId,
    gender,
    activeCharKey,
    setChartData,
    maxWorkers,
    optConfigId,
    t,
    throwGlobalError,
  ])

  const characterName = characterSheet?.name ?? 'Character Name'

  const setPlotBase = useCallback(
    (plotBase: string[] | undefined) => {
      database.optConfigs.set(optConfigId, { plotBase })
      setChartData(undefined)
    },
    [database, optConfigId, setChartData]
  )

  const getGraphBuildLabel = useCallback(
    (index: number) => (
      <Trans t={t} i18nKey="graphBuildLabel" count={index + 1}>
        Graph #{{ count: index + 1 }}
      </Trans>
    ),
    [t]
  )
  const getNormBuildLabel = useCallback((index: number) => `#${index + 1}`, [])

  return (
    <Box display="flex" flexDirection="column" gap={1}>
      {noArtifact && <NoArtWarning />}
      {/* Build Generator Editor */}
      <Grid container spacing={1}>
        {/* 1*/}
        <Grid
          item
          xs={12}
          sm={6}
          lg={3}
          display="flex"
          flexDirection="column"
          gap={1}
        >
          {/* character card */}
          <Box>
            <Suspense
              fallback={
                <Skeleton variant="rectangular" width="100%" height={600} />
              }
            >
              <CardThemed bgt="light">
                <CharacterCardHeader characterKey={characterKey}>
                  <CharacterCardHeaderContent characterKey={characterKey} />
                </CharacterCardHeader>
                <Box
                  sx={{
                    p: 1,
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1,
                  }}
                >
                  <CharacterCardEquipmentRow />
                  <CharacterCardStats />
                </Box>
              </CardThemed>
            </Suspense>
          </Box>
          <BonusStatsCard />
        </Grid>

        {/* 2 */}
        <Grid
          item
          xs={12}
          sm={6}
          lg={4}
          display="flex"
          flexDirection="column"
          gap={1}
        >
          <ArtifactConditionalConfig disabled={generatingBuilds} />
          <ArtifactFilters disabled={generatingBuilds} />
          {/* Minimum Final Stat Filter */}
          <StatFilterCard disabled={generatingBuilds} />
        </Grid>

        {/* 3 */}
        <Grid item xs={12} sm={6} lg={5} display="flex" flexDirection="column">
          <OptimizationTargetSelector
            optimizationTarget={optimizationTarget}
            setTarget={(target) =>
              database.optConfigs.set(optConfigId, {
                optimizationTarget: target,
              })
            }
            disabled={!!generatingBuilds}
            buttonSx={{
              borderRadius: '4px 4px 0px 0px',
              maxHeight: '5em',
            }}
          />
          <ButtonGroup>
            <DropdownButton
              disabled={generatingBuilds || !characterKey}
              sx={{ borderRadius: 0 }}
              fullWidth
              title={
                <Trans t={t} i18nKey="build" count={maxBuildsToShow}>
                  {{ count: maxBuildsToShow }} Builds
                </Trans>
              }
            >
              <MenuItem>
                <Typography variant="caption" color="info.main">
                  {t('buildDropdownDesc')}
                </Typography>
              </MenuItem>
              <Divider />
              {maxBuildsToShowList.map((v) => (
                <MenuItem
                  key={v}
                  onClick={() =>
                    database.optConfigs.set(optConfigId, { maxBuildsToShow: v })
                  }
                >
                  <Trans t={t} i18nKey="build" count={v}>
                    {{ count: v }} Builds
                  </Trans>
                </MenuItem>
              ))}
            </DropdownButton>
            <DropdownButton
              disabled={generatingBuilds || !characterKey}
              sx={{ borderRadius: 0 }}
              fullWidth
              title={
                <Trans t={t} i18nKey="thread" count={maxWorkers}>
                  {{ count: maxWorkers }} Threads
                </Trans>
              }
            >
              <MenuItem>
                <Typography variant="caption" color="info.main">
                  {t('threadDropdownDesc')}
                </Typography>
              </MenuItem>
              <Divider />
              {range(1, defThreads)
                .reverse()
                .map((v) => (
                  <MenuItem key={v} onClick={() => setMaxWorkers(v)}>
                    <Trans t={t} i18nKey="thread" count={v}>
                      {{ count: v }} Threads
                    </Trans>
                  </MenuItem>
                ))}
            </DropdownButton>
            <BootstrapTooltip placement="top" title={t`notifyTooltip`}>
              <Button
                sx={{ borderRadius: 0 }}
                color="warning"
                onClick={() => setnotification((n) => !n)}
              >
                {notification ? (
                  <NotificationsActiveIcon />
                ) : (
                  <NotificationsOffIcon />
                )}
              </Button>
            </BootstrapTooltip>
          </ButtonGroup>
          <BootstrapTooltip
            placement="top"
            title={
              !optimizationTargetNode || optimizationTargetNode.isEmpty
                ? t('selectTargetFirst')
                : ''
            }
          >
            <Box display="flex" flexGrow={1} maxHeight="5em">
              <Button
                disabled={
                  !characterKey ||
                  !optimizationTarget ||
                  !optimizationTargetNode ||
                  optimizationTargetNode.isEmpty
                }
                color={generatingBuilds ? 'error' : 'success'}
                onClick={
                  generatingBuilds
                    ? () => cancelToken.current()
                    : generateBuilds
                }
                startIcon={generatingBuilds ? <Close /> : <TrendingUp />}
                sx={{ borderRadius: '0px 0px 4px 4px' }}
                fullWidth
              >
                {generatingBuilds
                  ? t('generateButton.cancel')
                  : t('generateButton.generateBuilds')}
              </Button>
            </Box>
          </BootstrapTooltip>
        </Grid>
      </Grid>
      {/* Footer */}
      {!!characterKey && (
        <BuildAlert
          {...{ status: buildStatus, characterName, maxBuildsToShow }}
        />
      )}
      <Accordion
        sx={(theme) => ({
          bgcolor: theme.palette.contentLight.main,
          borderRadius: '4px',
          '&:before': {
            display: 'none',
          },
        })}
        disableGutters
      >
        <AccordionSummary expandIcon={<ExpandMore />}>
          {t('tcGraph.summary')}
          <InfoTooltip
            placement="top"
            title={t('page_character_optimize:tcGraph.desc')}
          />
        </AccordionSummary>
        <AccordionDetails>
          <ChartCard
            disabled={generatingBuilds || !optimizationTarget}
            plotBase={plotBase}
            setPlotBase={setPlotBase}
            showTooltip={!optimizationTarget}
          />
        </AccordionDetails>
      </Accordion>
      <CardThemed bgt="light">
        <CardContent>
          <Box display="flex" alignItems="center" gap={1} mb={1}>
            <Typography sx={{ flexGrow: 1 }}>
              {builds ? (
                <span>
                  Showing{' '}
                  <strong>
                    {builds.length + (graphBuilds ? graphBuilds.length : 0)}
                  </strong>{' '}
                  build generated for {characterName}.{' '}
                  {!!buildDate && (
                    <span>
                      Build generated on:{' '}
                      <strong>{new Date(buildDate).toLocaleString()}</strong>
                    </span>
                  )}
                </span>
              ) : (
                <span>Select a character to generate builds.</span>
              )}
            </Typography>
            <Button
              disabled={!builds.length}
              color="error"
              onClick={() => {
                setGraphBuilds(undefined)
                database.optConfigs.set(optConfigId, {
                  builds: [],
                  buildDate: 0,
                })
              }}
            >
              Clear Builds
            </Button>
          </Box>
          <Grid container display="flex" spacing={1}>
            <Grid item>
              <HitModeToggle size="small" />
            </Grid>
            <Grid item>
              <ReactionToggle size="small" />
            </Grid>
            <Grid item flexGrow={1} />
            <Grid item>
              <CompareBtn />
            </Grid>
          </Grid>
        </CardContent>
      </CardThemed>

      <OptimizationTargetContext.Provider value={optimizationTarget}>
        {graphBuilds && (
          <BuildList
            builds={graphBuilds}
            oldData={oldData}
            disabled={!!generatingBuilds}
            getLabel={getGraphBuildLabel}
            setBuilds={setGraphBuilds}
            mainStatAssumptionLevel={mainStatAssumptionLevel}
          />
        )}
        <BuildList
          builds={builds}
          oldData={oldData}
          disabled={!!generatingBuilds}
          getLabel={getNormBuildLabel}
          mainStatAssumptionLevel={mainStatAssumptionLevel}
        />
      </OptimizationTargetContext.Provider>
    </Box>
  )
}

function BuildList({
  builds,
  setBuilds,
  oldData,
  disabled,
  getLabel,
  mainStatAssumptionLevel,
}: {
  builds: GeneratedBuild[]
  setBuilds?: (builds: GeneratedBuild[] | undefined) => void
  oldData?: UIData
  disabled: boolean
  getLabel: (index: number) => Displayable
  mainStatAssumptionLevel: number
}) {
  const deleteBuild = useCallback(
    (index: number) => {
      if (setBuilds) {
        const builds_ = [...builds]
        builds_.splice(index, 1)
        setBuilds(builds_)
      }
    },
    [builds, setBuilds]
  )
  // retrive this value because inner calcs depends on this
  const teamCharacterContextValue = useContext(TeamCharacterContext)
  const {
    teamChar: { key: characterKey },
  } = teamCharacterContextValue
  // Memoize the build list because calculating/rendering the build list is actually very expensive, which will cause longer optimization times.
  const list = useMemo(
    () =>
      !!teamCharacterContextValue && (
        <Suspense
          fallback={
            <Skeleton variant="rectangular" width="100%" height={600} />
          }
        >
          {builds?.map((build, index) => (
            <DataContextWrapper
              key={index + Object.values(build.artifactIds).join()}
              characterKey={characterKey}
              build={build}
              oldData={oldData}
              mainStatAssumptionLevel={mainStatAssumptionLevel}
            >
              <BuildItemWrapper
                index={index}
                label={getLabel(index)}
                build={build}
                disabled={disabled}
                deleteBuild={setBuilds ? deleteBuild : undefined}
              />
            </DataContextWrapper>
          ))}
        </Suspense>
      ),
    [
      teamCharacterContextValue,
      builds,
      characterKey,
      oldData,
      disabled,
      getLabel,
      deleteBuild,
      setBuilds,
      mainStatAssumptionLevel,
    ]
  )
  return list
}
function BuildItemWrapper({
  index,
  label,
  build,
  disabled,
  deleteBuild,
}: {
  index: number
  label: Displayable
  build: GeneratedBuild
  disabled: boolean
  deleteBuild?: (index: number) => void
}) {
  const { t } = useTranslation('page_character_optimize')

  return (
    <BuildDisplayItem
      label={label}
      disabled={disabled}
      extraButtonsLeft={
        <>
          <CopyTcButton build={build} />
          <CopyBuildButton build={build} />
          {deleteBuild && (
            <Button
              color="error"
              size="small"
              startIcon={<DeleteForever />}
              onClick={() => deleteBuild(index)}
            >
              {t('removeBuildButton')}
            </Button>
          )}
        </>
      }
    />
  )
}
function CopyTcButton({ build }: { build: GeneratedBuild }) {
  const [name, setName] = useState('')
  const [showTcPrompt, onShowTcPrompt, OnHideTcPrompt] = useBoolState()

  const database = useDatabase()
  const {
    teamCharId,
    teamChar: { key: characterKey },
  } = useContext(TeamCharacterContext)

  const toTc = () => {
    const weaponTypeKey = getCharData(characterKey).weaponType
    const weapon = database.teamChars.getLoadoutWeapon(teamCharId)
    const buildTcId = database.teamChars.newBuildTcFromBuild(
      teamCharId,
      weaponTypeKey,
      weapon,
      Object.values(build.artifactIds).map((id) => database.arts.get(id))
    )
    if (buildTcId)
      database.buildTcs.set(buildTcId, {
        name,
      })

    setName('')
    OnHideTcPrompt()
  }
  return (
    <>
      <Button
        color="info"
        size="small"
        startIcon={<Science />}
        onClick={onShowTcPrompt}
      >
        New TC Build
      </Button>
      {/* TODO: Dialog Wanted to use a Dialog here, but was having some weird issues with closing out of it */}
      {/* TODO: Translation */}
      <ModalWrapper open={showTcPrompt} onClose={OnHideTcPrompt}>
        <CardThemed>
          <CardHeader
            title="New Theorycraft Build"
            action={<CloseButton onClick={OnHideTcPrompt} />}
          />
          <Divider />
          <CardContent
            sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}
          >
            <Typography>Copy over this build to a new TC Build</Typography>
            <TextField
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              margin="dense"
              label="TC Build Name"
              fullWidth
            />
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
              <Button onClick={OnHideTcPrompt}>Cancel</Button>
              <Button color="success" disabled={!name} onClick={toTc}>
                Create
              </Button>
            </Box>
          </CardContent>
        </CardThemed>
      </ModalWrapper>
    </>
  )
}
function CopyBuildButton({
  build: { artifactIds, weaponId },
}: {
  build: GeneratedBuild
}) {
  const [name, setName] = useState('')
  const [showTcPrompt, onShowTcPrompt, OnHideTcPrompt] = useBoolState()

  const database = useDatabase()
  const { teamCharId } = useContext(TeamCharacterContext)

  const toLoadout = () => {
    database.teamChars.newBuild(teamCharId, {
      name,
      artifactIds,
      weaponId,
    })

    setName('')
    OnHideTcPrompt()
  }
  return (
    <>
      <Button
        color="info"
        size="small"
        startIcon={<CheckroomIcon />}
        onClick={onShowTcPrompt}
      >
        New Build
      </Button>
      {/* TODO: Dialog Wanted to use a Dialog here, but was having some weird issues with closing out of it */}
      {/* TODO: Translation */}
      <ModalWrapper open={showTcPrompt} onClose={OnHideTcPrompt}>
        <CardThemed>
          <CardHeader
            title="New Build"
            action={<CloseButton onClick={OnHideTcPrompt} />}
          />
          <Divider />
          <CardContent
            sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}
          >
            <Typography>Copy over this build to a new build</Typography>
            <TextField
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              margin="dense"
              label="Build Name"
              fullWidth
            />
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
              <Button onClick={OnHideTcPrompt}>Cancel</Button>
              <Button color="success" disabled={!name} onClick={toLoadout}>
                Create
              </Button>
            </Box>
          </CardContent>
        </CardThemed>
      </ModalWrapper>
    </>
  )
}

type Prop = {
  children: React.ReactNode
  characterKey: CharacterKey
  build: GeneratedBuild
  oldData?: UIData
  mainStatAssumptionLevel: number
}
function DataContextWrapper({
  children,
  characterKey,
  build,
  oldData,
  mainStatAssumptionLevel,
}: Prop) {
  const { artifactIds, weaponId } = build
  const database = useDatabase()
  // Update the build when the build artifacts/weapons are changed.
  const [dirty, setDirty] = useForceUpdate()
  useEffect(() => {
    const unfollowArts = Object.values(artifactIds).map((id) =>
      database.arts.follow(id, () => setDirty())
    )
    return () => {
      unfollowArts.forEach((unfollow) => unfollow())
    }
  }, [database, artifactIds, setDirty])
  useEffect(
    () =>
      weaponId ? database.weapons.follow(weaponId, () => setDirty()) : () => {},
    [database, weaponId, setDirty]
  )
  const buildsArts = useMemo(
    () =>
      dirty &&
      (Object.values(artifactIds)
        .map((i) => database.arts.get(i))
        .filter((a) => a) as ICachedArtifact[]),
    [dirty, artifactIds, database]
  )
  const buildWeapon = useMemo(
    () => dirty && database.weapons.get(weaponId),
    [dirty, weaponId, database]
  )
  const teamData = useTeamData(mainStatAssumptionLevel, buildsArts, buildWeapon)
  const providerValue = useMemo(() => {
    const tdc = teamData?.[characterKey]
    if (!tdc) return undefined
    return { data: tdc.target, teamData, oldData }
  }, [teamData, oldData, characterKey])
  if (!providerValue) return null
  return (
    <DataContext.Provider value={providerValue}>
      {children}
    </DataContext.Provider>
  )
}
