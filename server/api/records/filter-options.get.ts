/**
 * Distinct filter facets across the user's WHOLE collection.
 *
 * Previously the collection page derived genres/styles/countries/labels/year
 * from only the currently-loaded page of records, so the Country facet was
 * always empty and the year range was wrong until everything scrolled in.
 * This computes them once, server-side, across every record.
 *
 * Note: this selects only the five small facet columns (not the heavy
 * discogsData JSON), so the payload stays light. If a collection grows very
 * large this can be moved to a raw `unnest(...) GROUP BY` aggregation.
 */
export default defineEventHandler(async (event) => {
  try {
    const userEmail = getCookie(event, 'user_email')
    if (!userEmail) {
      throw createError({ statusCode: 401, message: 'Authentication required' })
    }

    const user = await prisma.user.findUnique({ where: { email: userEmail } })
    if (!user) {
      throw createError({ statusCode: 404, message: 'User not found' })
    }

    const rows = await prisma.userRecord.findMany({
      where: { userId: user.id },
      select: {
        release: {
          select: {
            genres: true,
            styles: true,
            country: true,
            label: true,
            year: true,
          },
        },
      },
    })

    const genres = new Set<string>()
    const styles = new Set<string>()
    const countries = new Set<string>()
    const labels = new Set<string>()
    let minYear: number | null = null
    let maxYear: number | null = null

    for (const { release } of rows) {
      if (!release) continue
      release.genres?.forEach((g) => g && genres.add(g))
      release.styles?.forEach((s) => s && styles.add(s))
      if (release.country) countries.add(release.country)
      if (release.label) labels.add(release.label)
      if (release.year != null) {
        minYear = minYear === null ? release.year : Math.min(minYear, release.year)
        maxYear = maxYear === null ? release.year : Math.max(maxYear, release.year)
      }
    }

    const sorted = (set: Set<string>) => Array.from(set).sort((a, b) => a.localeCompare(b))

    return {
      genres: sorted(genres),
      styles: sorted(styles),
      countries: sorted(countries),
      labels: sorted(labels),
      years: {
        min: minYear ?? 1950,
        max: maxYear ?? new Date().getFullYear(),
      },
    }
  } catch (error: any) {
    if (error.statusCode) throw error
    throw createError({ statusCode: 500, message: 'Failed to load filter options' })
  }
})
